import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { publicContactService } from '@/features/contactMessages/api/contactMessageService';
import { CONTACT_MESSAGE_MIN, ContactMessageType } from '@/features/contactMessages/types';
import { getApiErrorMessage } from '@/lib/apiError';

// İletişim sayfasının "Mesaj bırakın" formunun durumu ve gönderimi (her tasarımın formu bunu kullanır): konu, ad,
// telefon ya da e-posta (isteğe bağlı), mesaj, KVKK onayı ve gizli "website" bot tuzağı. Admin panelinde
// "Şikayet ve Öneriler"e düşer; sunucu sık denemeyi sınırlar (429).

export function useContactForm(branchId: string) {
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [type, setType] = useState<ContactMessageType>(ContactMessageType.Oneri);
    const [message, setMessage] = useState('');
    const [consent, setConsent] = useState(false);
    const [website, setWebsite] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (sending) return;
        if (!name.trim()) { setError('Adınızı girin.'); return; }
        if (message.trim().length < CONTACT_MESSAGE_MIN) { setError(`Mesajınız en az ${CONTACT_MESSAGE_MIN} karakter olmalı.`); return; }
        if (!consent) { setError('Devam etmek için KVKK aydınlatma metnini onaylayın.'); return; }

        setSending(true);
        setError(null);
        try {
            await publicContactService.submit({ branchId, name: name.trim(), contact: contact.trim(), type, message: message.trim(), website });
            setSent(true);
            setName('');
            setContact('');
            setMessage('');
            setConsent(false);
            setType(ContactMessageType.Oneri);
        } catch (err) {
            if (isAxiosError(err) && err.response?.status === 429) setError('Çok sık deneme yapıldı. Birkaç dakika sonra tekrar deneyin.');
            else if (isAxiosError(err) && !err.response) setError('Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.');
            else setError(getApiErrorMessage(err, 'Mesajınız gönderilemedi. Lütfen tekrar deneyin.'));
        } finally {
            setSending(false);
        }
    };

    return {
        name, setName, contact, setContact, type, setType, message, setMessage, consent, setConsent, website, setWebsite,
        sending, error, sent, submit, reset: () => setSent(false),
    };
}
