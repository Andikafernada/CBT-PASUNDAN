const fs = require('fs');
const path = require('path');

const files = [
  'src/app/admin/dashboard/page.tsx',
  'src/app/admin/exams/page.tsx',
  'src/app/admin/exams/[examId]/analysis/page.tsx',
  'src/app/admin/grades/page.tsx',
  'src/app/admin/questions/page.tsx',
  'src/app/admin/questions/import/page.tsx',
  'src/app/admin/students/page.tsx',
  'src/app/admin/subjects/page.tsx',
  'src/app/admin/users/page.tsx',
  'src/app/admin/users/import/page.tsx',
  'src/app/admin/legacy-import/page.tsx',
];

function transformTheme(content) {
  let res = content;

  // 1. Modals overlay background
  res = res.replace(/bg-black\/80/g, 'bg-black/60 backdrop-blur-xs');
  res = res.replace(/bg-black\/70/g, 'bg-black/60 backdrop-blur-xs');

  // 2. Main containers & card backgrounds
  res = res.replace(/(?<!dark:)bg-slate-900(?!\/)/g, 'bg-white dark:bg-slate-900');
  res = res.replace(/(?<!dark:)bg-slate-950(?!\/)/g, 'bg-slate-50 dark:bg-slate-950');

  // 3. Borders
  res = res.replace(/(?<!dark:)border-slate-800(?!\/)/g, 'border-slate-200 dark:border-slate-800');
  res = res.replace(/(?<!dark:)border-slate-700(?!\/)/g, 'border-slate-200 dark:border-slate-700');

  // 4. Text colors
  res = res.replace(/(?<!dark:)text-white(?!\/)/g, 'text-slate-900 dark:text-white');
  res = res.replace(/(?<!dark:)text-slate-400(?!\/)/g, 'text-slate-500 dark:text-slate-400');
  res = res.replace(/(?<!dark:)text-slate-300(?!\/)/g, 'text-slate-700 dark:text-slate-300');

  // 5. Gradients from-slate-900
  res = res.replace(/bg-gradient-to-br from-slate-900 to-slate-800/g, 'bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 shadow-sm');
  res = res.replace(/bg-gradient-to-br from-slate-900 to-slate-950/g, 'bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 shadow-sm');

  // 6. Fix text-white inside colored buttons (buttons with bg-blue-600, bg-emerald-600, bg-rose-600, bg-purple-600 should stay text-white)
  res = res.replace(/bg-blue-600 text-slate-900 dark:text-white/g, 'bg-blue-600 text-white');
  res = res.replace(/bg-emerald-600 text-slate-900 dark:text-white/g, 'bg-emerald-600 text-white');
  res = res.replace(/bg-rose-600 text-slate-900 dark:text-white/g, 'bg-rose-600 text-white');
  res = res.replace(/bg-purple-600 text-slate-900 dark:text-white/g, 'bg-purple-600 text-white');
  res = res.replace(/bg-blue-500 text-slate-900 dark:text-white/g, 'bg-blue-500 text-white');
  res = res.replace(/bg-emerald-500 text-slate-900 dark:text-white/g, 'bg-emerald-500 text-white');

  // Clean duplicate classes if any
  res = res.replace(/dark:dark:/g, 'dark:');
  res = res.replace(/text-slate-900 dark:text-white dark:text-white/g, 'text-slate-900 dark:text-white');
  res = res.replace(/bg-white dark:bg-slate-900 dark:bg-slate-900/g, 'bg-white dark:bg-slate-900');

  return res;
}

const baseDir = path.join(__dirname, '..');
files.forEach((rel) => {
  const full = path.join(baseDir, rel);
  if (fs.existsSync(full)) {
    console.log('Transforming:', rel);
    const content = fs.readFileSync(full, 'utf-8');
    const updated = transformTheme(content);
    fs.writeFileSync(full, updated, 'utf-8');
  }
});
console.log('THEME_TRANSFORMATION_DONE');
