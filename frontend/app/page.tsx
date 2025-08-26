"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { VideoIcon, UsersIcon, MessageSquareIcon, LoaderIcon, AlertCircleIcon, CheckCircleIcon } from "lucide-react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()
  const [roomName, setRoomName] = useState("")
  const [joinRoomId, setJoinRoomId] = useState("")
  const [userName, setUserName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const handleCreateRoom = async () => {
    if (roomName.trim() && userName.trim()) {
      setIsCreating(true)
      setFeedback(null)

      try {
        // Generate a simple room ID
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()

        setFeedback({ type: "success", message: `Room "${roomName}" created successfully! Joining now...` })

        // Small delay to show success message
        setTimeout(() => {
          router.push(`/room/${roomId}}`)
        }, 1000)
      } catch {
        setFeedback({ type: "error", message: "Failed to create room. Please try again." })
        setIsCreating(false)
      }
    }
  }

  const handleJoinRoom = async () => {
    if (joinRoomId.trim() && userName.trim()) {
      setIsJoining(true)
      setFeedback(null)

      try {
        if (joinRoomId.length < 4) {
          throw new Error("Room ID must be at least 4 characters long")
        }

        setFeedback({ type: "success", message: `Joining room ${joinRoomId}...` })

        // Small delay to show success message
        setTimeout(() => {
          router.push(`/room/${joinRoomId}?name=${encodeURIComponent(userName)}`)
        }, 1000)
      } catch (error) {
        setFeedback({
          type: "error",
          message:
            error instanceof Error ? error.message : "Failed to join room. Please check the room ID and try again.",
        })
        setIsJoining(false)
      }
    }
  }

  const clearFeedback = () => {
    if (feedback) {
      setFeedback(null)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <VideoIcon className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">VideoChat</h1>
          </div>
          <p className="text-muted-foreground">Create or join a room to start your video conversation</p>
        </div>

        {feedback && (
          <Alert className={feedback.type === "error" ? "border-destructive" : "border-primary"}>
            {feedback.type === "error" ? (
              <AlertCircleIcon className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircleIcon className="h-4 w-4 text-primary" />
            )}
            <AlertDescription className={feedback.type === "error" ? "text-destructive" : "text-primary"}>
              {feedback.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-center text-card-foreground">Get Started</CardTitle>
            <CardDescription className="text-center">Enter your name and create or join a room</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Name Input */}
            <div className="space-y-2">
              <Label htmlFor="userName" className="text-card-foreground">
                Your Name
              </Label>
              <Input
                id="userName"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value)
                  clearFeedback()
                }}
                className="bg-input border-border text-foreground"
                disabled={isCreating || isJoining}
              />
            </div>

            {/* Tabs for Create/Join */}
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted">
                <TabsTrigger
                  value="create"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  disabled={isCreating || isJoining}
                >
                  Create Room
                </TabsTrigger>
                <TabsTrigger
                  value="join"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  disabled={isCreating || isJoining}
                >
                  Join Room
                </TabsTrigger>
              </TabsList>

              {/* Create Room Tab */}
              <TabsContent value="create" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="roomName" className="text-card-foreground">
                    Room Name
                  </Label>
                  <Input
                    id="roomName"
                    placeholder="Enter room name"
                    value={roomName}
                    onChange={(e) => {
                      setRoomName(e.target.value)
                      clearFeedback()
                    }}
                    className="bg-input border-border text-foreground"
                    disabled={isCreating || isJoining}
                  />
                </div>
                <Button
                  onClick={handleCreateRoom}
                  disabled={!roomName.trim() || !userName.trim() || isCreating || isJoining}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isCreating ? (
                    <>
                      <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                      Creating Room...
                    </>
                  ) : (
                    <>
                      <UsersIcon className="h-4 w-4 mr-2" />
                      Create Room
                    </>
                  )}
                </Button>
              </TabsContent>

              {/* Join Room Tab */}
              <TabsContent value="join" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="joinRoomId" className="text-card-foreground">
                    Room ID
                  </Label>
                  <Input
                    id="joinRoomId"
                    placeholder="Enter room ID"
                    value={joinRoomId}
                    onChange={(e) => {
                      setJoinRoomId(e.target.value.toUpperCase())
                      clearFeedback()
                    }}
                    className="bg-input border-border text-foreground"
                    disabled={isCreating || isJoining}
                  />
                </div>
                <Button
                  onClick={handleJoinRoom}
                  disabled={!joinRoomId.trim() || !userName.trim() || isCreating || isJoining}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isJoining ? (
                    <>
                      <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                      Joining Room...
                    </>
                  ) : (
                    <>
                      <VideoIcon className="h-4 w-4 mr-2" />
                      Join Room
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <VideoIcon className="h-6 w-6 mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">HD Video</p>
          </div>
          <div className="space-y-2">
            <UsersIcon className="h-6 w-6 mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Multi-user</p>
          </div>
          <div className="space-y-2">
            <MessageSquareIcon className="h-6 w-6 mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Text Chat</p>
          </div>
        </div>
      </div>
    </div>
  )
}
