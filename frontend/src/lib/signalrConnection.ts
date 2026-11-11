import * as signalR from '@microsoft/signalr';
import { redirectToLogin, refreshAccessToken } from './axiosInstance';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5077';

export interface ManagedHubConnection {
    connection: signalR.HubConnection;
    // Effect cleanup'ında connection.stop() yerine bunu çağır — yoksa onclose,
    // unmount sırasındaki kasıtlı kapanışı da "bağlantı koptu" sanıp yeniden bağlanmaya çalışır.
    stop: () => void;
}

// ── Canlı bağlantı durumu ──
// Açık tüm hub bağlantılarının en kötü durumu: rol ekranlarının başlığındaki nokta ve "bağlantı koptu" şeridi bunu gösterir.
export type HubStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
type HubState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

const hubStates = new Map<number, HubState>();
const statusListeners = new Set<() => void>();
let nextHubId = 1;
let currentStatus: HubStatus = 'idle';

function recomputeStatus() {
    const values = [...hubStates.values()];
    const next: HubStatus = values.length === 0 ? 'idle'
        : values.includes('disconnected') ? 'disconnected'
            : values.includes('reconnecting') ? 'reconnecting'
                : values.includes('connecting') ? 'connecting'
                    : 'connected';
    if (next === currentStatus) return;
    currentStatus = next;
    statusListeners.forEach(listener => listener());
}

function setHubState(id: number, state: HubState | null) {
    if (state === null) hubStates.delete(id);
    else hubStates.set(id, state);
    recomputeStatus();
}

export function subscribeHubStatus(listener: () => void): () => void {
    statusListeners.add(listener);
    return () => { statusListeners.delete(listener); };
}

export function getHubStatus(): HubStatus {
    return currentStatus;
}

export function createHubConnection(hubPath: string): ManagedHubConnection {
    let intentionallyStopped = false;
    const hubId = nextHubId++;

    const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_BASE_URL}${hubPath}`, {
            accessTokenFactory: () => localStorage.getItem('token') ?? '',
        })
        .withAutomaticReconnect()
        .configureLogging({
            log(logLevel: signalR.LogLevel, message: string) {
                if (message.includes('stopped during negotiation')) return;
                if (logLevel >= signalR.LogLevel.Error) console.error(message);
            },
        })
        .build();

    const originalStart = connection.start.bind(connection);
    connection.start = () => {
        setHubState(hubId, 'connecting');
        return originalStart().then(
            () => { if (!intentionallyStopped) setHubState(hubId, 'connected'); },
            err => { if (!intentionallyStopped) setHubState(hubId, 'disconnected'); throw err; },
        );
    };
    connection.onreconnecting(() => setHubState(hubId, 'reconnecting'));
    connection.onreconnected(() => setHubState(hubId, 'connected'));

    // withAutomaticReconnect() birkaç deneme sonra pes ederse (ör. access token süresi dolduğu
    // için negotiate hep 401 dönüyorsa) burada bir kez refresh deneyip bağlantıyı yeniden kurar.
    connection.onclose(async () => {
        if (intentionallyStopped) return;
        setHubState(hubId, 'disconnected');

        const newToken = await refreshAccessToken();
        if (newToken) {
            connection.start().catch(() => {});
        } else {
            redirectToLogin();
        }
    });

    return {
        connection,
        stop: () => {
            intentionallyStopped = true;
            setHubState(hubId, null);
            connection.stop();
        },
    };
}
