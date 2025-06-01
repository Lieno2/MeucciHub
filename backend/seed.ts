import { PrismaClient, Prisma } from '@prisma/client';
import axios from 'axios';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

async function fetchHtmlContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    console.error(`❌ ${error}`);
    throw new Error(String(error));
  }
}

function addMinutes(timeStr: string, minsToAdd: number): string {
  const [hourStr, minuteStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  let minute = parseInt(minuteStr, 10);

  minute += minsToAdd;
  while (minute >= 60) {
    minute -= 60;
    hour += 1;
  }

  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function calculateEndTime(rowIndex: number, startTime: string): string {
  // Define durations in minutes for each hour block (0-based index)
  const durations = [50, 60, 55, 55, 55, 55, 50];

  // Define breaks after which we add extra minutes (row indices after which break occurs)

  // Base endTime = startTime + duration + total extra breaks before this lesson
  const duration = durations[rowIndex] ?? 50; // fallback 50 min if rowIndex out of range

  // Add duration + break minutes to startTime
  const endTime = addMinutes(startTime, duration);

  return endTime;
}

function formatTime(timeStr: string | undefined): string {
  if (!timeStr) return '';
  const [hour, minute] = timeStr.split('.');
  if (!hour || !minute) return '';
  return `${hour.padStart(2, '0')}:${minute}`;
}

function looksLikeClassroom(text: string): boolean {
  if (!text) return false;
  const keywords = ['LAB', 'SCIENZE', 'PAL', 'TE', 'AULA', 'ROOM', 'PALAESTRA'];
  const upper = text.toUpperCase();
  return keywords.some(k => upper.includes(k)) || /\d/.test(text);
}

function cleanText(text: string): string {
  return text.replace(/\u00a0/g, '').trim();
}

async function main() {
  const baseUrl = 'https://orario.itismeucci.edu.it/2024-2025/2025-04-26%20-%20Orario%20a%207%20ore/';
  const indexUrl = `${baseUrl}index.html`;

  console.log('✨ Starting seed script...');
  console.log(`🔎 Stage 1: Discovering Class Schedule URLs from: ${indexUrl}`);

  let classScheduleLinks: { name: string; url: string }[] = [];

  try {
    const indexHtml = await fetchHtmlContent(indexUrl);
    const $index = cheerio.load(indexHtml);

    const classLinkElements = $index('a.mathema[href$=".html"]');
    const validClassNameRegex = /^\d\^?[A-Z]+(?:-[A-Z]+)?$/;

    classLinkElements.each((_i, el) => {
      const linkText = $index(el).text().trim();
      const href = $index(el).attr('href');
      if (href && validClassNameRegex.test(linkText)) {
        classScheduleLinks.push({
          name: linkText.replace(/\.html$/, '').replace(/-/g, ''),
          url: `${baseUrl}${href}`,
        });
      }
    });

    if (classScheduleLinks.length === 0) {
      console.warn('⚠️ No class links found.');
      return;
    }

    console.log(`✅ Found ${classScheduleLinks.length} class schedule links.`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  console.log('\n🗑️ Clearing existing data...');
  await prisma.lesson.deleteMany();
  await prisma.class.deleteMany();
  console.log('✅ Database cleared.');

  console.log('\n🚀 Stage 2: Processing class schedules...');

  let seededClasses = 0;
  let skippedClasses = 0;
  let totalLessons = 0;

  for (const classData of classScheduleLinks) {
    console.log(`\n➡️ Processing "${classData.name}" from ${classData.url}`);
    let createdClass: { id: string } | null = null;

    try {
      createdClass = await prisma.class.create({ data: { name: classData.name } });
      const html = await fetchHtmlContent(classData.url);
      const $ = cheerio.load(html);
      const rows = $('tbody tr');

      if (rows.length === 0) {
        console.warn(`⚠️ No schedule rows for "${classData.name}". Skipping.`);
        skippedClasses++;
        continue;
      }

      const lessonsToCreate: Prisma.LessonCreateInput[] = [];

      rows.each((rowIndex, row) => {
        const cells = $(row).find('td');
        if (cells.length === 0) return;

        // First cell: start time
        const startTimeRaw = $(cells[0]).text().trim();
        const startTime = formatTime(startTimeRaw);
        const endTime = calculateEndTime(rowIndex, startTime);

        if (!startTime) {
          console.log(`   [Row ${rowIndex}] Missing start time. Skipping row.`);
          return;
        }

        let dayIndex = 1;
        for (let i = 1; i < cells.length; i++) {

          const cell = $(cells[i]);
          if (!cell) {
            dayIndex++;
            continue
          }

          // Collect all data from <p> inside the cell in order
          const paragraphs = cell.find('p').toArray();

          // Filter out empty paragraphs (whitespace or &nbsp;)
          const nonEmptyParagraphs = paragraphs.filter(p => {
            const text = $(p).text().replace(/\u00a0/g, '').trim();
            return text.length > 0;
          });

          if (nonEmptyParagraphs.length === 0) {
            dayIndex++;
            continue;
          }

          // Extract text from each <p>, including anchors inside
          const dataElements: string[] = [];

          nonEmptyParagraphs.forEach(p => {
            const pEl = $(p);
            pEl.contents().each((_, el) => {
              const $el = $(el);
              if ($el.is('a')) {
                const text = cleanText($el.text());
                if (text) dataElements.push(text);
              } else if (el.type === 'text') {
                const text = cleanText($el.text());
                if (text) dataElements.push(text);
              }
            });
          });

          // Expect dataElements to contain [subject, teacher, room] or similar
          if (dataElements.length < 2) {
            console.log(`   [Row ${rowIndex}, Day ${dayIndex}] Insufficient lesson data:`, dataElements);
            dayIndex++;
            continue;
          }

          const subject = dataElements[0];
          let teacher = dataElements[1];

          if(dataElements.length >= 4)
              teacher += dataElements[2];

          let room = dataElements[dataElements.length-1];

          if(dataElements.length == 5)
            room += dataElements[3];

          if (!subject) {
            console.log(`   [Row ${rowIndex}, Day ${dayIndex}] Missing subject. Skipping.`);
            dayIndex++;
            continue;
          }



          if (!teacher) {
            console.log(`   [Row ${rowIndex}, Day ${dayIndex}] Missing teacher. Skipping.`);
            dayIndex++;
            continue;
          }

          const lesson: Prisma.LessonCreateInput = {
            class: { connect: { id: createdClass!.id } },
            day: dayIndex - 1,
            startTime,
            endTime,
            subject,
            teacher,
            room,
          };

          lessonsToCreate.push(lesson);
          console.log(`   ✅ [Row ${rowIndex}, Day ${dayIndex}] ${subject} | ${teacher} | ${room}`);

          if(cells.length-1 > 5) {

            if (i + 1 < cells.length) {
              const next = $(cells[i + 1]);
              const nextColspan = parseInt(next.attr('colspan') || '1', 10);
              const currentColspan = parseInt(cell.attr('colspan') || '1', 10);
              if (!(nextColspan == 1 && currentColspan == 1))
                dayIndex++;

            }

          } else
            dayIndex++;

        }
      });

      // Insert all lessons for this class
      for (const lesson of lessonsToCreate) {
        await prisma.lesson.create({ data: lesson });
      }

      totalLessons += lessonsToCreate.length;
      seededClasses++;
      console.log(`   ✅ Seeded ${lessonsToCreate.length} lessons for "${classData.name}".`);
    } catch (err) {
      console.error(`❌ Error processing class ${classData.name}:`, err);
      skippedClasses++;
    }
  }

  console.log('\n🎉 Seeding completed.');
  console.log(`✅ Classes seeded: ${seededClasses}`);
  console.log(`⚠️ Classes skipped: ${skippedClasses}`);
  console.log(`📚 Lessons seeded: ${totalLessons}`);

  await prisma.$disconnect();
}

main().catch(error => {
  console.error('❌ Fatal error in main():', error);
  process.exit(1);
});
