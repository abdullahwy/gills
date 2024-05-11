const {
  DisconnectReason,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");

const makeWASocket = require("@whiskeysockets/baileys").default;
const qrimage = require("qr-image");
const express = require("express");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.send("This is the root route.");
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

async function connectionLogic() {
  const { state, saveCreds } = await useMultiFileAuthState("session");

  const sock = makeWASocket({
    printQRInTerminal: false,
    auth: state,
    browser: Browsers.ubuntu("BOT_NAME"),
    syncFullHistory: true,
  });
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update || {};

    if (qr) {
      //console.log(qr);
      // write cutom logic over here
      var qr_img = qrimage.image(qr, { type: "png" });
      qr_img.pipe(require("fs").createWriteStream("public/qr.png"));
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode != DisconnectReason.loggedOut;

      if (shouldReconnect) {
        connectionLogic();
      }
    }
  });
  sock.ev.on("messages.upsert", (messageInfoUpsert) => {
    console.log(messageInfoUpsert);
  });
  await sock.sendMessage(sock.user.jid, {
    text: `*Welcome to BOT_NAME*\n\n⚠️ Please don't share below file with others... ⚠️\n\nTEAM_NAME`,
  });
  await sock.sendMessage(sock.user.jid, {
    video: fs.readFileSync("session/session.json"),
    caption: "⚠️ Don't share this file with others... ⚠️\n\nTEAM_NAME",
  });
  sock.ev.on("creds.update", saveCreds);
}

connectionLogic();
