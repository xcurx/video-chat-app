export interface Peer {
  id: string
  name: string
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  streamId?: string
  remoteStream?: MediaStream
}