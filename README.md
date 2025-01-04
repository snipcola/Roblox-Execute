## Roblox Execute

Allows for you to execute scripts in Roblox. You still need an executor, of course.

### Instructions

1. Put the following script inside of your `autoexec` folder (it might be named differently):

   ```lua
   local Config = {
     Name = "RobloxExecute",
     Address = "ws://127.0.0.1:53203",
     CheckInterval = 1000,
     PingInterval = 1000,
     CheckActiveInterval = 1000,
     MinActive = 3000,
   }

   assert(WebSocket and WebSocket.connect, "Executor doesn't support WebSockets.")

   local Players = game:GetService("Players")
   local Socket, Checking, LastActive
   local Active = true

   local function GetStore(Key)
     return getgenv()[`{Config.Name}-{Key}`]
   end

   local function SetStore(Key, Value)
     getgenv()[`{Config.Name}-{Key}`] = Value
   end

   local function SetSocket(NewSocket)
     Socket = NewSocket
     LastActive = Socket and tick() or nil
   end

   local function OnMessage(Text)
     if Text == `{Config.Name}-Pong` then
       LastActive = tick()
     else
       local Callback, Error = loadstring(Text)

       if Error then
         error(Error, 2)
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
     if Checking then
       return
     end

     Checking = true
     local Success, NewSocket = pcall(WebSocket.connect, Config.Address)

     if Success and Active then
       SetSocket(NewSocket)
       task.spawn(SetPlayerName)
       Socket.OnMessage:Connect(OnMessage)
       Socket.OnClose:Wait()
       SetSocket(nil)
     elseif NewSocket then
       NewSocket:Close()
     end

     Checking = false
   end

   local function TimeElapsed(LastTime, Threshold)
     return LastTime and tick() - LastTime > Threshold / 1000
   end

   local function Wait(Interval)
     return task.wait((Interval and Interval > 0) and (Interval / 1000) or 0)
   end

   local function Disconnect()
     Active = false

     if Socket then
       Socket:Close()
     end
   end

   local ExistingDisconnect = GetStore("Disconnect")

   if ExistingDisconnect and typeof(ExistingDisconnect) == "function" then
     ExistingDisconnect()
   end

   SetStore("Disconnect", Disconnect)

   task.spawn(function()
     Connect()

     while Wait(Config.CheckInterval) and Active do
       Connect()
     end
   end)

   task.spawn(function()
     while Wait(Config.PingInterval) and Active do
       if Socket then
         Socket:Send(`{Config.Name}-Ping`)
       end
     end
   end)

   task.spawn(function()
     while Wait(Config.CheckActiveInterval) and Active do
       if Socket and TimeElapsed(LastActive, Config.MinActive) then
         Socket:Close()
       end
     end
   end)
   ```

2. Ensure this extension is installed, your IDE is open, and attach.

3. On the bottom left of your IDE, you should see the client(s) connected.

   Ensure the file extension is one of the following:

   - `luau`
   - `lua`
   - `txt`

   Or, alternatively, ensure the tabs language is set to:

   - `luau`
   - `lua`
   - `plaintext` (default)
