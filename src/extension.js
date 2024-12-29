const vscode = require("vscode");
const path = require("path");
const WebSocket = require("ws");
const { v4: uuid } = require("uuid");

const config = {
  name: "RobloxExecute",
  command: "roblox-execute.execute-script",
  button: {
    position: vscode.StatusBarAlignment.Left,
    priority: -10,
  },
  port: 53203,
  extensions: ["lua", "luau", "txt"],
  languages: ["lua", "luau", "plaintext"],
  interval: 500,
  minActive: 3000,
};

let server;
let clients = [];
let buttons = [];

function isValidFile() {
  const editor = vscode.window.activeTextEditor;
  const name = editor && editor.document.fileName;

  const extension = name && path.extname(name).replace(".", "");
  const language = editor && editor.document.languageId;

  return (
    config.extensions.includes(extension) || config.languages.includes(language)
  );
}

function clearButtons() {
  for (const { button } of buttons) {
    button.dispose();
  }

  buttons = [];
}

let number = 0;

function addButton(client) {
  const id = client?.id || "all";
  const text = client?.name || number + 1;
  const button = vscode.window.createStatusBarItem(
    config.button.position,
    config.button.priority - number,
  );

  button.text = `$(debug-start) ${client ? text : "All"}`;
  button.command = {
    command: config.command,
    arguments: [id],
  };

  if (client) number++;
  buttons.push({
    button,
    id,
  });
}

function setButtons() {
  clearButtons();
  number = 0;

  if (clients.length > 1) {
    addButton();
  }

  for (const client of clients) {
    addButton(client);
  }

  checkActive();
}

function showButtons() {
  for (const { button } of buttons) {
    button.show();
  }
}

function hideButtons() {
  for (const { button } of buttons) {
    button.hide();
  }
}

function checkActive() {
  const hasClients = clients.length > 0;
  const validFile = isValidFile();

  if (hasClients && validFile) showButtons();
  else hideButtons();
}

function parseName(text) {
  if (!text || text.length < 2) {
    return;
  }

  if (text.length > 10) {
    return text.substring(0, 10) + "..";
  }

  return text;
}

function setClientName(id, name) {
  const index = clients.findIndex((c) => c.id === id);

  if (index !== -1) {
    clients[index].name = name;
    setButtons();
  }
}

function initialize() {
  server = new WebSocket.Server({ port: config.port });

  server.on("connection", function (client) {
    const id = uuid();
    let pingTimeout;

    function setPingTimeout() {
      if (pingTimeout) {
        clearTimeout(pingTimeout);
      }

      pingTimeout = setTimeout(function () {
        client.close();
      }, config.minActive);
    }

    setPingTimeout();
    clients.push({ id, ws: client });
    setButtons();

    client.on("message", function (data) {
      const text = data.toString();

      if (text === `${config.name}-Ping`) {
        client.send(`${config.name}-Pong`);
        setPingTimeout();
      } else {
        const name = parseName(text);
        setClientName(id, name);
      }
    });

    client.on("close", function () {
      if (pingTimeout) clearTimeout(pingTimeout);
      clients = clients.filter((c) => c.id !== id);
      setButtons();
    });
  });

  server.on("close", function () {
    clients = [];
    setButtons();
  });
}

function execute(id) {
  const client = id !== "all" && clients.find((c) => c.id === id);
  const editor = vscode.window.activeTextEditor;
  const script = editor && editor.document.getText();
  if (!script) return;

  if (client) {
    client.ws.send(script);
  } else {
    for (const client of clients) {
      client.ws.send(script);
    }
  }
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand(config.command, execute),
    vscode.window.onDidChangeActiveTextEditor(checkActive),
  );

  initialize();
  setInterval(checkActive, config.interval);
}

function deactivate() {
  if (server) server.close();
  clearButtons();
}

module.exports = {
  activate,
  deactivate,
};
