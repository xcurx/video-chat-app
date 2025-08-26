import { RefObject } from "react";

interface SendSignalArgs {
    wsRef: RefObject<WebSocket | null>;
    type: string;
    payload: unknown;
}

export const sendSignal = ({wsRef, type, payload}: SendSignalArgs) => {
    console.log('>>> Sending signal:', type, payload);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
};
