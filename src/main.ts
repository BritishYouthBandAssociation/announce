import express from 'express';
import 'dotenv/config';
import {engine} from 'express-handlebars';

const app = express();

app.engine("hbs", engine({extname: ".hbs"}));
app.set("view engine", "hbs");

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.get("/", (req, res) => {
    res.send("hi");
});

//final catch-all 404
app.use((_, res) => res.status(404).render("error"));

const port = parseInt(process.env.PORT ?? "0");
app.listen(port, () => `Listening on port ${port}`);