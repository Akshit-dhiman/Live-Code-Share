"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { io, type Socket } from "socket.io-client"
import Editor, { type Monaco } from "@monaco-editor/react"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"
import {
  User,
  Code2,
  ArrowLeft,
  Globe,
  Laptop,
  Moon,
  Sun,
  Copy,
  Share2,
  MessageSquare,
  Download,
  Trash2,
  ChevronsUpDown,
} from "lucide-react"
import { useTheme } from "next-themes"
import { LanguageSelector } from "@/components/language-selector"
import { UserAvatar } from "@/components/user-avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { EditorToolbar } from "@/components/editor-toolbar"
import { ChatMessage } from "@/components/chat-message"
import { languages } from "@/lib/languages"
import Link from "next/link"
import { useSession } from "next-auth/react"

// Define types
interface UserInfo {
  id: string
  name: string
}

interface ChatMessageType {
  id: string
  userId: string
  userName: string
  text: string
  timestamp: Date
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

export default function EditorPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const { data: session } = useSession()

  const roomId = params.roomId as string
  const userName = searchParams.get("name") || session?.user?.name || "Anonymous"

  const [languageSelectorOpen, setLanguageSelectorOpen] = useState<boolean>(false)
  const [selectedLanguage, setSelectedLanguage] = useState("javascript")

  const [socket, setSocket] = useState<Socket | null>(null)
  const [code, setCode] = useState<string>("// Start coding here...")
  const [users, setUsers] = useState<UserInfo[]>([])
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isEditorReady, setIsEditorReady] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<string>("editor")
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [fontSize, setFontSize] = useState<number>(14)
  const [editorTheme, setEditorTheme] = useState<string>("vs-dark")
  const [chatMessages, setChatMessages] = useState<ChatMessageType[]>([])
  const [chatInput, setChatInput] = useState<string>("")
  const [monaco, setMonaco] = useState<Monaco | null>(null)

  const editorRef = useRef<any>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const previewIframeRef = useRef<HTMLIFrameElement>(null)

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(BACKEND_URL, {
      query: {
        roomId,
        userName,
      },
    })

    newSocket.on("connect", () => {
      setIsConnected(true)
      toast({
        title: "Connected to server",
        description: `You've joined room: ${roomId}`,
      })
    })

    newSocket.on("disconnect", () => {
      setIsConnected(false)
      toast({
        title: "Disconnected from server",
        description: "Trying to reconnect...",
        variant: "destructive",
      })
    })

    newSocket.on("connect_error", (error) => {
      toast({
        title: "Connection error",
        description: error.message,
        variant: "destructive",
      })
    })

    newSocket.on("user-list-update", (updatedUsers: UserInfo[]) => {
      setUsers(updatedUsers)
    })

    newSocket.on("code-change", (updatedCode: string) => {
      setCode(updatedCode)
    })

    newSocket.on("language-change", (updatedLanguage: string) => {
      setSelectedLanguage(updatedLanguage)
    })


    newSocket.on("chat-message", (message: ChatMessageType) => {
      setChatMessages((prev) => [...prev, { ...message, timestamp: new Date(message.timestamp) }])

      // Scroll to bottom of chat
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
      }, 100)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [roomId, userName, toast])

  // Update preview when code or language changes
  useEffect(() => {
    if (activeTab === "preview") {
      updatePreview()
    }
  }, [code, selectedLanguage, activeTab])

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current && activeTab === "chat") {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages, activeTab])

  // Handle fullscreen mode
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    document.addEventListener("keydown", handleEsc)
    return () => {
      document.removeEventListener("keydown", handleEsc)
    }
  }, [isFullscreen])

  const handleCodeChange = (value = "") => {
    setCode(value)
    socket?.emit("code-change", { roomId, code: value })
  }

  const handleLanguageChange = (value: string) => {
  setSelectedLanguage(value)
  socket?.emit("language-change", { roomId, language: value })
}


  const handleLeaveRoom = () => {
    router.push("/")
  }

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor
    setMonaco(monaco)
    setIsEditorReady(true)
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId)
    toast({
      title: "Copied!",
      description: "Room ID has been copied to clipboard",
      duration: 2000,
    })
  }

  const shareRoom = () => {
    const url = `${window.location.origin}/editor/${roomId}`
    navigator.clipboard.writeText(url)
    toast({
      title: "Copied!",
      description: "Room link has been copied to clipboard",
      duration: 2000,
    })
  }

  const downloadCode = () => {
    const element = document.createElement("a")
    const file = new Blob([code], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `code.${selectedLanguage}`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)

    toast({
      title: "Downloaded!",
      description: `File saved as code.${selectedLanguage}`,
      duration: 2000,
    })
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const increaseFontSize = () => {
    setFontSize((prev) => Math.min(prev + 2, 24))
  }

  const decreaseFontSize = () => {
    setFontSize((prev) => Math.max(prev - 2, 10))
  }

  const toggleEditorTheme = () => {
    setEditorTheme((prev) => (prev === "vs-dark" ? "vs-light" : "vs-dark"))
  }

  const clearEditor = () => {
    if (confirm("Are you sure you want to clear the editor?")) {
      handleCodeChange("")
      toast({
        title: "Editor cleared",
        description: "All code has been removed",
        duration: 2000,
      })
    }
  }

  const copyAllCode = () => {
    navigator.clipboard.writeText(code)
    toast({
      title: "Copied!",
      description: "All code has been copied to clipboard",
      duration: 2000,
    })
  }

  const sendChatMessage = () => {
    if (!chatInput.trim() || !socket) return

    const message: Omit<ChatMessageType, "timestamp"> = {
      id: Date.now().toString(),
      userId: socket.id,
      userName,
      text: chatInput,
    }

    socket.emit("chat-message", { roomId, message })
    setChatInput("")
  }

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendChatMessage()
    }
  }

  const updatePreview = () => {
    if (!previewIframeRef.current) return

    // Only generate preview for web languages
    if (["html", "javascript", "typescript", "css"].includes(selectedLanguage)) {
      let previewContent = ""

      if (selectedLanguage === "html") {
        previewContent = code
      } else if (selectedLanguage === "javascript" || selectedLanguage === "typescript") {
        previewContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Code Preview</title>
              <style>
                body { 
                  font-family: sans-serif; 
                  padding: 20px;
                  background-color: #f5f5f5;
                  color: #333;
                }
                .output {
                  background-color: white;
                  border: 1px solid #ddd;
                  border-radius: 4px;
                  padding: 15px;
                  margin-top: 10px;
                  white-space: pre-wrap;
                }
                .error {
                  color: red;
                  border-left: 3px solid red;
                  padding-left: 10px;
                  margin: 10px 0;
                  background-color: rgba(255,0,0,0.05);
                }
              </style>
            </head>
            <body>
              <h3>JavaScript Output:</h3>
              <div id="output" class="output"></div>
              <script>
                const output = document.getElementById('output');
                const originalConsoleLog = console.log;
                const originalConsoleError = console.error;
                
                console.log = function(...args) {
                  originalConsoleLog.apply(console, args);
                  output.innerHTML += args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
                  ).join(' ') + '<br>';
                };
                
                console.error = function(...args) {
                  originalConsoleError.apply(console, args);
                  output.innerHTML += '<div class="error">' + args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
                  ).join(' ') + '</div>';
                };
                
                try {
                  ${code}
                } catch (error) {
                  console.error('Error:', error.message);
                }
              </script>
            </body>
          </html>
        `
      } else if (selectedLanguage === "css") {
        previewContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>CSS Preview</title>
              <style>${code}</style>
            </head>
            <body>
              <div class="preview-container">
                <h3>CSS Preview</h3>
                <p>This is a paragraph to demonstrate text styling.</p>
                <div class="box">This is a div with class "box"</div>
                <button>This is a button</button>
                <a href="#">This is a link</a>
                <ul>
                  <li>List item 1</li>
                  <li>List item 2</li>
                  <li>List item 3</li>
                </ul>
              </div>
            </body>
          </html>
        `
      }

      const iframe = previewIframeRef.current
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

      if (iframeDoc) {
        iframeDoc.open()
        iframeDoc.write(previewContent)
        iframeDoc.close()
      }
    }
  }

  return (
    <SidebarProvider>
      <div className={`flex h-screen bg-black ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
        {!isFullscreen && (
          <Sidebar className="border-r border-zinc-800">
            <SidebarHeader className="p-4 border-b border-zinc-800">
              <Link href="/" className="flex items-center gap-2">
                <Code2 className="h-5 w-5" />
                <h1 className="font-bold">LiveCodeShare</h1>
              </Link>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Room Information</SidebarGroupLabel>
                <div className="px-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-400">Room ID:</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyRoomId}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy Room ID</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="bg-zinc-800 rounded p-2 mb-4">
                    <code className="text-xs font-mono">{roomId}</code>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-400">Share:</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={shareRoom}>
                      <Share2 className="h-3 w-3 mr-1" />
                      Share Link
                    </Button>
                  </div>
                </div>
              </SidebarGroup>

              <SidebarSeparator />

              <SidebarGroup>
                <SidebarGroupLabel>Users in Room</SidebarGroupLabel>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {users.map((user) => (
                      <UserAvatar key={user.id} name={user.name} isCurrentUser={user.id === socket?.id} />
                    ))}
                  </div>

                  <SidebarMenu>
                    {users.map((user) => (
                      <SidebarMenuItem key={user.id}>
                        <SidebarMenuButton>
                          <User className="h-4 w-4 mr-2" />
                          <span>
                            {user.name}
                            {user.id === socket?.id ? " (You)" : ""}
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                    {users.length === 0 && <p className="text-sm text-zinc-500 px-2">No users connected</p>}
                  </SidebarMenu>
                </div>
              </SidebarGroup>

              <SidebarSeparator />

              <SidebarGroup>
                <SidebarGroupLabel>Actions</SidebarGroupLabel>
                <div className="p-4 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start border-zinc-700"
                    onClick={downloadCode}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start border-zinc-700"
                    onClick={copyAllCode}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start border-zinc-700"
                    onClick={clearEditor}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Editor
                  </Button>
                </div>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center gap-2 border-zinc-700"
                onClick={handleLeaveRoom}
              >
                <ArrowLeft className="h-4 w-4" />
                Leave Room
              </Button>
            </SidebarFooter>
          </Sidebar>
        )}

        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-[200px] justify-between bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
                  onClick={() => setLanguageSelectorOpen(!languageSelectorOpen)}
                >
                  {selectedLanguage ? languages.find((lang) => lang.value === selectedLanguage)?.label : "Select language..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
                {languageSelectorOpen && (
                  <LanguageSelector
                    value={selectedLanguage}
                    onValueChange={(newLang) => {
                      setSelectedLanguage(newLang)
                      setLanguageSelectorOpen(false)
                    }}
                    open={languageSelectorOpen}
                    onOpenChange={setLanguageSelectorOpen}
                  />
                )}
              </div>

              <div className="bg-zinc-800 rounded-md p-0.5 flex">
                <button
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                    activeTab === "editor" ? "bg-zinc-700" : "hover:bg-zinc-700/50"
                  }`}
                  onClick={() => setActiveTab("editor")}
                >
                  Editor
                </button>
                <button
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                    activeTab === "chat" ? "bg-zinc-700" : "hover:bg-zinc-700/50"
                  }`}
                  onClick={() => setActiveTab("chat")}
                >
                  Chat
                </button>
                <button
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                    activeTab === "preview" ? "bg-zinc-700" : "hover:bg-zinc-700/50"
                  }`}
                  onClick={() => setActiveTab("preview")}
                >
                  Preview
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                <span className="text-sm text-zinc-400">{isConnected ? "Connected" : "Disconnected"}</span>
              </div>
            </div>
          </div>

          {activeTab === "editor" && (
            <EditorToolbar
              isFullscreen={isFullscreen}
              toggleFullscreen={toggleFullscreen}
              increaseFontSize={increaseFontSize}
              decreaseFontSize={decreaseFontSize}
              fontSize={fontSize}
              toggleEditorTheme={toggleEditorTheme}
              editorTheme={editorTheme}
              copyAllCode={copyAllCode}
              clearEditor={clearEditor}
            />
          )}

          <div className="flex-1 overflow-hidden">
            {activeTab === "editor" && (
              <div className="h-full w-full">
                <Editor
                  height="100%"
                  width="1250px"
                  language={selectedLanguage}
                  value={code}
                  onChange={handleCodeChange}
                  theme={editorTheme}
                  options={{
                    minimap: { enabled: false },
                    fontSize: fontSize,
                    wordWrap: "on",
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    lineNumbers: "on",
                    renderLineHighlight: "all",
                    tabSize: 2,
                  }}
                  onMount={handleEditorDidMount}
                  loading={<div className="flex items-center justify-center h-full">Loading editor...</div>}
                  className="h-full w-full"
                />
              </div>
            )}

            {activeTab === "chat" && (
              <div className="flex flex-col h-full p-4">
                <div
                  ref={chatContainerRef}
                  className="flex-1 bg-zinc-900 rounded-lg border border-zinc-800 p-4 mb-4 overflow-y-auto"
                >
                  {chatMessages.length > 0 ? (
                    chatMessages.map((message) => (
                      <ChatMessage key={message.id} message={message} isCurrentUser={message.userId === socket?.id} />
                    ))
                  ) : (
                    <div className="text-center text-zinc-500 py-8 flex flex-col items-center justify-center h-full">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No messages yet</p>
                      <p className="text-sm mt-2">Start the conversation!</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    className="bg-zinc-900 border-zinc-700"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                  />
                  <Button onClick={sendChatMessage} disabled={!chatInput.trim() || !isConnected}>
                    Send
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "preview" && (
              <div className="h-full bg-zinc-900 p-4 overflow-auto">
                {["html", "javascript", "typescript", "css"].includes(selectedLanguage) ? (
                  <iframe
                    ref={previewIframeRef}
                    className="w-full h-full bg-white rounded border border-zinc-700"
                    title="Code Preview"
                    sandbox="allow-scripts"
                  />
                ) : (
                  <div className="text-center text-zinc-500 py-8">
                    <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Preview not supported for {selectedLanguage}</p>
                    <p className="text-sm mt-2">Preview is only available for HTML, JavaScript, TypeScript, and CSS.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <Globe className="h-3 w-3" />
              <span>{isConnected ? "Real-time collaboration active" : "Waiting for connection..."}</span>
            </div>
            <div className="flex items-center gap-2">
              <Laptop className="h-3 w-3" />
              <span>Editor: {isEditorReady ? "Ready" : "Loading..."}</span>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
