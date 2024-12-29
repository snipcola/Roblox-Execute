local Config = {
  Name = "RobloxExecute",
  Address = "ws://127.0.0.1:53203",
  CheckInterval = 1000,
  PingInterval = 1000,
  MinActive = 3000
}

assert(WebSocket and WebSocket.connect, "Executor doesn't support WebSockets.")

local RunService = game:GetService("RunService")
local Players = game:GetService("Players")

local Socket
local CheckLock
local LastCheck
local LastActive

local function GetStore(Key)
  return getgenv()[`{Config.Name}-{Key}`]
end

local function SetStore(Key, Value)
  getgenv()[`{Config.Name}-{Key}`] = Value
end

local function SetSocket(NewSocket)
  Socket = NewSocket
  SetStore("Socket", NewSocket)

  LastCheck = Socket and tick() - 1 or nil
  LastActive = Socket and tick() or nil
end

local function OnMessage(Text)
  if Text == `{Config.Name}-Pong` then
    LastActive = tick()
  else
    local Callback, Error = loadstring(Text)

    if Error then
      error(Error)
    end

    task.spawn(Callback)
  end
end

local function SetPlayerName()
  local Player = Players.LocalPlayer

  if not Player then
    Players:GetPropertyChangedSignal("LocalPlayer"):Wait()
    Player = Players.LocalPlayer
  end

  if Socket then
    Socket:Send(Player.Name)
  end
end

local function Connect()
  local Success, _Socket = pcall(WebSocket.connect, Config.Address)

  if Success then
    SetSocket(_Socket)
    task.spawn(SetPlayerName)
    Socket.OnMessage:Connect(OnMessage)
    Socket.OnClose:Wait()
    SetSocket(nil)
  end

  task.wait(Config.CheckInterval / 1000)
  CheckLock = false
end

local function TimeElapsed(LastTime, Threshold)
  return LastTime and tick() - LastTime > Threshold / 1000
end

local function Check()
  if not CheckLock then
    CheckLock = true
    Connect()
  elseif Socket and TimeElapsed(LastActive, Config.MinActive) then
    Socket:Close()
  elseif Socket and TimeElapsed(LastCheck, Config.PingInterval) then
    Socket:Send(`{Config.Name}-Ping`)
    LastCheck = tick()
  end
end

local ExistingConnection = GetStore("Connection")
local ExistingSocket = GetStore("Socket")

if ExistingConnection and typeof(ExistingConnection) == "RBXScriptConnection" then
  ExistingConnection:Disconnect()
end

if ExistingSocket then
  ExistingSocket:Close()
end

local Connection = RunService.Heartbeat:Connect(Check)
SetStore("Connection", Connection)