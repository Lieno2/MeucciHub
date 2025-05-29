import { PrismaClient, Prisma } from '@prisma/client';
import axios from 'axios';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

function getReadableErrorMessage(error: unknown, context: string = 'An unexpected error occurred'): string {
  if (axios.isAxiosError(error)) {
    const status = error.response ? ` (Status: ${error.response.status})` : '';
    const data = error.response && typeof error.response.data === 'string' ? ` - Details: ${error.response.data}` : '';
    return `${context}: Network or HTTP error${status}${data} - ${error.message}`;
  }
  if (error instanceof Error) {
    return `${context}: ${error.message}`;
  }
  return `${context}: ${String(error)}`;
}

async function fetchHtmlContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    const errorMessage = getReadableErrorMessage(error, `Failed to fetch content from URL: ${url}`);
    console.error(`❌ ${errorMessage}`);
    throw new Error(errorMessage);
  }
}

function formatTime(timeStr: string | undefined): string {
  if (!timeStr) return '';
  const [hour, minute] = timeStr.split('.');
  if (!hour || !minute) return '';
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
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
        classScheduleLinks.push({ name: linkText.replace(/\.html$/, '').replace(/-/g, ''), url: `${baseUrl}${href}` });
      }
    });

    if (classScheduleLinks.length === 0) {
      console.warn('⚠️ No class links found.');
      return;
    }

    console.log(`✅ Found ${classScheduleLinks.length} class schedule links.`);
  } catch (error) {
    console.error(`❌ ${getReadableErrorMessage(error, 'Stage 1 error')}`);
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

        const startTimeRaw = $(cells[0]).text().trim();
        const startTime = formatTime(startTimeRaw);

        if (!startTime) {
          console.log(`   [Row ${rowIndex}] Missing start time. Skipping row.`);
          return;
        }

        for (let dayIndex = 1; dayIndex <= 5; dayIndex++) {
          const cell = $(cells[dayIndex]);
          const p = cell.find('p');
          if (p.length < 3) {
            console.log(`   [Row ${rowIndex}, Day ${dayIndex}] Skipped (less than 3 <p>)`);
            continue;
          }

          const subject = cleanText(p.eq(0).text());
          if (!subject) continue;

          const prof1 = cleanText(p.eq(1).text());
          const p3Text = cleanText(p.eq(2).text());

          if (!p3Text) {
            console.log(`   [Row ${rowIndex}, Day ${dayIndex}] Skipped (p3 empty)`);
            continue;
          }

          let prof2 = '';
          let room = '';

          if (looksLikeClassroom(p3Text)) {
            room = p3Text;
          } else {
            prof2 = p3Text;
          }

          if (p.length > 3) {
            const p4Text = cleanText(p.eq(3).text());
            if (!room && looksLikeClassroom(p4Text)) {
              room = p4Text;
            } else if (!prof2) {
              prof2 = p4Text;
            }
          }

          lessonsToCreate.push({
            class: { connect: { id: createdClass!.id } },
            day: dayIndex - 1,
            startTime,
            endTime: '',
            subject,
            teacher: [prof1, prof2].filter(Boolean).join(', '),
            room,
          });

          console.log(`   ✅ [Row ${rowIndex}, Day ${dayIndex}] ${subject} | ${[prof1, prof2].filter(Boolean).join(', ')} | ${room}`);
        }
      });

      if (lessonsToCreate.length > 0) {
        for (const lesson of lessonsToCreate) {
          await prisma.lesson.create({ data: lesson });
        }
        totalLessons += lessonsToCreate.length;
        console.log(`   ✅ Seeded ${lessonsToCreate.length} lessons for "${classData.name}".`);
      } else {
        console.warn(`   ⚠️ No lessons found for "${classData.name}".`);
      }

      seededClasses++;
    } catch (err) {
      console.error(`❌ ${getReadableErrorMessage(err, `Processing "${classData.name}"`)}`);
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
