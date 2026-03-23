'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type Language = 'uz' | 'en' | 'ru';

interface TermsPopupProps {
  open: boolean;
  onAccept: () => void;
}

const contentData = {
  uz: {
    warning: '!!! OGOHLANTIRISH !!!',
    questions: [
      'Studentlardan keladigan savollar:',
      "Bu javoblari to'g'rimi?",
      'Shu testlar aniq tushadimi?',
      '100% kafolat beriladimi?',
    ],
    paragraph1:
      "Universitet sessiya uchun platforma. Bizga studentlar sessiyaga tushadigan savollarni tashlab beradi lekin javoblarini emas. Shu boisdan platformada ai orqali javob topiladi. Ai o'zi to'g'ri javobni topadi darsliklar orqali va quiz uchun qo'shimcha variantlarni o'zi tuzadi. Lekin sessiyada o'sha kiritilgan variantlar bo'lmasligi mumkin lekin mantiqan to'gri javob bizni platforma topgan javobga o'xshaydi. Bizda demo varianti bor. Birinchi demoni ishlab , tekshirib keyin to'lov qilinsin.",
    paragraph2:
      "Aniq tushadimi yo'qmi unisiga javob bermaymiz. Biz shunchaki bor materiallarni quizga aylantirib beramiz tayyorlanish uchun.",
    button: 'Tushundim',
  },
  en: {
    warning: '!!! WARNING !!!',
    questions: [
      'Frequently asked questions from students:',
      'Are these answers correct?',
      'Will exactly these tests appear?',
      'Is there a 100% guarantee?',
    ],
    paragraph1:
      'This is a platform for university exams. Students send us the exam questions, but not the answers. Therefore, answers are found via AI on the platform. The AI automatically finds the correct answer using textbooks and generates additional options for the quiz. However, the options provided in the real exam might not be exactly the same, but the logically correct answer will be similar to the one found by our platform. We have a demo version. Please try and check the demo first before making a payment.',
    paragraph2:
      'We do not guarantee whether these exact questions will appear or not. We simply convert the available materials into a quiz for preparation.',
    button: 'I understand',
  },
  ru: {
    warning: '!!! ВНИМАНИЕ !!!',
    questions: [
      'Частые вопросы от студентов:',
      'Правильные ли эти ответы?',
      'Точно ли попадутся эти тесты?',
      'Дается ли 100% гарантия?',
    ],
    paragraph1:
      'Платформа для университетских сессий. Студенты отправляют нам вопросы к сессии, но не ответы. Поэтому ответы находятся на платформе с помощью ИИ. ИИ сам находит правильный ответ по учебникам и составляет дополнительные варианты для викторины (quiz). Но на самой сессии введенных вариантов может и не быть, однако логически правильный ответ будет похож на тот, что нашла наша платформа. У нас есть демо-версия. Сначала пройдите и проверьте демо, а затем уже производите оплату.',
    paragraph2:
      'Мы не отвечаем за то, точно ли эти вопросы попадутся или нет. Мы просто превращаем имеющиеся материалы в викторину для подготовки.',
    button: 'Я понимаю',
  },
};

export function TermsPopup({ open, onAccept }: TermsPopupProps) {
  const [lang, setLang] = useState<Language>('uz');

  if (!open) return null;

  const t = contentData[lang];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col my-auto max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h2 className="text-red-600 dark:text-red-500 font-bold text-xl uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis mr-2">
            {t.warning}
          </h2>
          <div className="flex gap-1.5 shrink-0">
            {(['uz', 'ru', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-md transition-colors uppercase cursor-pointer ${
                  lang === l
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800/80'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="font-medium bg-red-50/80 dark:bg-red-950/20 p-4 rounded-lg border border-red-100 dark:border-red-900/30">
            <p className="mb-2.5 font-bold text-red-800 dark:text-red-400">
              {t.questions[0]}
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-sm ml-1 text-red-700 dark:text-red-400/90 italic">
              <li>{t.questions[1]}</li>
              <li>{t.questions[2]}</li>
              <li>{t.questions[3]}</li>
            </ul>
          </div>

          <p className="text-sm md:text-base leading-relaxed text-gray-700 dark:text-gray-300 text-justify">
            {t.paragraph1}
          </p>
          <p className="text-sm md:text-base leading-relaxed text-gray-700 dark:text-gray-300 text-justify font-medium border-l-4 border-yellow-400 dark:border-yellow-600 pl-3">
            {t.paragraph2}
          </p>
        </div>

        <div className="p-5 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 sticky bottom-0 z-10 mt-auto">
          <Button onClick={onAccept} className="w-full sm:w-auto font-semibold px-8 min-w-[140px]" variant="default">
            {t.button}
          </Button>
        </div>
      </div>
    </div>
  );
}
