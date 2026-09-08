import * as signalR from '@microsoft/signalr';
import { redirectToLogin, refreshAccessToken } from './axiosInstance';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5077';

export interface ManagedHubConnection {
    connection: signalR.HubConnection;
    // Effect cleanup'ında connection.stop() yerine bunu çağır — yoksa onclose,
    // unmount sırasındaki kasıtlı kapanışı da "bağlantı koptu" sanıp yeniden bağlanmaya çalışır.
    stop: () => void;
}

export function createHubConnection(hubPath: string): ManagedHubConnection {
    let intentionallyStopped = false;

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

    // withAutomaticReconnect() birkaç deneme sonra pes ederse (ör. access token süresi dolduğu
    // için negotiate hep 401 dönüyorsa) burada bir kez refresh deneyip bağlantıyı yeniden kurar.
    connection.onclose(async () => {
        if (intentionallyStopped) return;

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
            connection.stop();
        },
    };
}
