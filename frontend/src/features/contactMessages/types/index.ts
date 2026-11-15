// Restoran sitesinin İletişim formundan gelen mesajlar (admin "Şikayet ve Öneriler").
// Backend ContactMessageType: Oneri = 1, Sikayet = 2, Diger = 3.
export const ContactMessageType = {
    Oneri: 1,
    Sikayet: 2,
    Diger: 3,
} as const;
export type ContactMessageType = typeof ContactMessageType[keyof typeof ContactMessageType];

export const CONTACT_MESSAGE_TYPES: { value: ContactMessageType; label: string }[] = [
    { value: ContactMessageType.Oneri, label: 'Öneri' },
    { value: ContactMessageType.Sikayet, label: 'Şikayet' },
    { value: ContactMessageType.Diger, label: 'Diğer' },
];

export function contactMessageTypeLabel(type: ContactMessageType): string {
    return CONTACT_MESSAGE_TYPES.find(t => t.value === type)?.label ?? 'Diğer';
}

// Domain ContactMessage sabitleriyle aynı.
export const CONTACT_NAME_MAX = 100;
export const CONTACT_CONTACT_MAX = 100;
export const CONTACT_MESSAGE_MIN = 5;
export const CONTACT_MESSAGE_MAX = 2000;

export interface ContactMessage {
    id: string;
    name: string;
    contact: string;
    type: ContactMessageType;
    message: string;
    isRead: boolean;
    createdAt: string;
}

export interface ContactMessageInput {
    branchId?: string;
    name: string;
    contact: string;
    type: ContactMessageType;
    message: string;
    /** Bal küpü: gizli alan, boş gitmeli. */
    website: string;
}
