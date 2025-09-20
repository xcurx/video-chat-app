export interface Peer {
  id: string
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  streamId?: string
  remoteStream?: MediaStream
}