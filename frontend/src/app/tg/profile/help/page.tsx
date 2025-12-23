'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTelegram } from '../../components/TelegramProvider'

interface FAQItem {
  question: string
  answer: string
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Как сделать заказ?',
    answer: 'Отсканируйте QR-код на автомате, выберите товары из меню, добавьте в корзину и оплатите удобным способом.',
  },
  {
    question: 'Как использовать промокод?',
    answer: 'В корзине введите промокод в специальное поле и нажмите "Применить". Скидка автоматически применится к заказу.',
  },
  {
    question: 'Как накопить бонусные баллы?',
    answer: 'Баллы начисляются автоматически за каждую покупку: 1 балл за каждые 1000 сум. Также баллы можно получить за приглашение друзей и участие в акциях.',
  },
  {
    question: 'Как использовать бонусы?',
    answer: 'В корзине включите опцию "Использовать бонусы". Баллами можно оплатить до 50% стоимости заказа.',
  },
  {
    question: 'Что делать, если товар не выдан?',
    answer: 'Если после оплаты товар не был выдан, свяжитесь с нашей поддержкой. Мы вернём деньги или предоставим товар повторно.',
  },
  {
    question: 'Как вернуть деньги?',
    answer: 'Для возврата средств обратитесь в поддержку с номером заказа. Деньги будут возвращены в течение 3 рабочих дней.',
  },
  {
    question: 'Почему автомат не работает?',
    answer: 'Если автомат не отвечает, возможно он временно отключен для обслуживания. Попробуйте ближайший автомат или сообщите о проблеме.',
  },
]

export default function HelpPage() {
  const router = useRouter()
  const { isReady, webApp, showBackButton, hideBackButton, hapticFeedback } = useTelegram()

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  // Back button
  useEffect(() => {
    if (isReady) {
      showBackButton(() => router.push('/tg/profile'))
      return () => hideBackButton()
    }
  }, [isReady, router, showBackButton, hideBackButton])

  const toggleFAQ = (index: number) => {
    hapticFeedback?.impactOccurred('light')
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  const handleContactSupport = () => {
    hapticFeedback?.impactOccurred('medium')
    if (webApp) {
      // Open support chat in Telegram
      webApp.openTelegramLink('https://t.me/VendHubSupport')
    } else {
      window.open('https://t.me/VendHubSupport', '_blank')
    }
  }

  const handleCallSupport = () => {
    hapticFeedback?.impactOccurred('medium')
    window.location.href = 'tel:+998901234567'
  }

  return (
    <div className="tg-app tg-bottom-safe">
      {/* Header */}
      <div className="tg-header">
        <div className="tg-header-title">Помощь</div>
      </div>

      {/* Contact options */}
      <div className="tg-section">
        <div className="tg-section-title">Связаться с нами</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div
            className="tg-card"
            onClick={handleContactSupport}
            style={{ textAlign: 'center', cursor: 'pointer' }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            <div style={{ fontWeight: 500 }}>Telegram</div>
            <div className="tg-hint" style={{ fontSize: 12 }}>Чат поддержки</div>
          </div>
          <div
            className="tg-card"
            onClick={handleCallSupport}
            style={{ textAlign: 'center', cursor: 'pointer' }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📞</div>
            <div style={{ fontWeight: 500 }}>Телефон</div>
            <div className="tg-hint" style={{ fontSize: 12 }}>+998 90 123 45 67</div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="tg-section">
        <div className="tg-section-title">Часто задаваемые вопросы</div>
        <div className="tg-list">
          {FAQ_ITEMS.map((item, index) => (
            <div key={index}>
              <div
                className="tg-list-item"
                onClick={() => toggleFAQ(index)}
                style={{ cursor: 'pointer' }}
              >
                <div className="tg-list-item-content">
                  <div className="tg-list-item-title">{item.question}</div>
                </div>
                <div
                  style={{
                    color: 'var(--tg-hint-color)',
                    fontSize: 20,
                    transform: expandedIndex === index ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  ›
                </div>
              </div>
              {expandedIndex === index && (
                <div
                  style={{
                    padding: '0 16px 16px 16px',
                    backgroundColor: 'var(--tg-secondary-bg-color)',
                    marginTop: -8,
                    borderRadius: '0 0 12px 12px',
                  }}
                >
                  <div className="tg-hint" style={{ fontSize: 14, lineHeight: 1.5 }}>
                    {item.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Report issue */}
      <div className="tg-section">
        <div className="tg-section-title">Сообщить о проблеме</div>
        <div className="tg-card">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Что-то пошло не так?</div>
            <div className="tg-hint" style={{ fontSize: 13 }}>
              Опишите проблему, и мы постараемся помочь как можно скорее
            </div>
          </div>
          <button
            className="tg-button tg-button-primary"
            onClick={handleContactSupport}
            style={{ width: '100%' }}
          >
            Написать в поддержку
          </button>
        </div>
      </div>

      {/* Working hours */}
      <div className="tg-section">
        <div className="tg-card" style={{ backgroundColor: 'var(--tg-secondary-bg-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24 }}>🕐</div>
            <div>
              <div style={{ fontWeight: 500 }}>Время работы поддержки</div>
              <div className="tg-hint" style={{ fontSize: 13 }}>
                Ежедневно с 9:00 до 22:00
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
