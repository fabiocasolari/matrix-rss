import('node-fetch').then((fetch) => {
    // Il resto del codice va qui
    const RSSParser = require('rss-parser');
    const sqlite3 = require('sqlite3').verbose();

    const parser = new RSSParser();
    const db = new sqlite3.Database('./rss_feed.db');

    const homeserverUrl = "YOUR_MATRIX_URL";
    const accessToken = "AUTH_TOKEN"; // Inserisci il tuo access token qui

    // Configuration of RSS feeds
    const feeds = [
        { url: 'RSS_URL', roomId: 'MATRIX_ROOM_ID' },
        { url: 'RSS_URL', roomId: 'MATRIX_ROOM_ID' }
    ];

    // Initialize SQLite database
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS articles (
            id TEXT PRIMARY KEY,
            title TEXT,
            link TEXT
        )`);
    });

    // Function to send a message to a Matrix room
    async function sendMessage(roomId, message) {
        const response = await fetch.default(`${homeserverUrl}/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/send/m.room.message`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                msgtype: 'm.text',
                body: message
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to send message: ${response.statusText}`);
        }

        // Log the title and roomId to console
        console.log(`Message sent to room ${roomId}: ${message}`);
    }

    // Function to process RSS feeds
    async function processFeeds() {
        for (const feed of feeds) {
            const feedData = await parser.parseURL(feed.url);
            for (const item of feedData.items) {
                const articleId = item.id || item.link;
                db.get('SELECT 1 FROM articles WHERE id = ?', [articleId], async (err, row) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    if (!row) {
                        // New article
                        const message = `**${item.title}**\n\n${item.contentSnippet || item.content}\n\nRead more: ${item.link}`;
                        await sendMessage(feed.roomId, message);
                        db.run('INSERT INTO articles (id, title, link) VALUES (?, ?, ?)', [articleId, item.title, item.link]);
                    }
                });
            }
        }
    }

    // Main function to run the program every 60 seconds
    async function main() {
        setInterval(processFeeds, 60000); // Run every 60 seconds
    }

    main().catch(console.error);
}).catch((error) => {
    console.error('Failed to import node-fetch:', error);
});
