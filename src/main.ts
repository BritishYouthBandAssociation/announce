import express from 'express';
import 'dotenv/config';
import { engine } from 'express-handlebars';

const app = express();

app.engine("hbs", engine({ extname: ".hbs" }));
app.set("view engine", "hbs");

app.get("/", (_, res) => {
    res.send("hi");
});

//final catch-all 404
app.use((_, res) => res.status(404).render("error", {
    title: "Not Found"
}));

const port = parseInt(process.env.PORT ?? "0");
app.listen(port, () => `Listening on port ${port}`);