import express from 'express';
import 'dotenv/config';
import { engine } from 'express-handlebars';
import path from 'path';

const app = express();

const ordinalRules = new Intl.PluralRules('en', { type: 'ordinal' });
const cdnBase = process.env.NODE_ENV == "production" ? "https://cdn.byba.online" : "https://dev.cdn.byba.online";

app.engine("hbs", engine({
    extname: ".hbs", helpers: {
        ordinal: (number: number) => {
            const category = ordinalRules.select(number);
            if (category == "one") {
                return `${number}st`;
            }

            if (category == "two") {
                return `${number}nd`;
            }

            if (category == "few") {
                return `${number}rd`;
            }

            return `${number}th`;
        },
        eq: (val1: any, val2: any, opts: Handlebars.HelperOptions) => val1 == val2 ? opts.fn(this) : opts.inverse(this),
        cdnLink: (filename: string) => `${cdnBase}/${filename}`
    }
}));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "../views"));
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
    res.render("home", {
        title: "Results Viewer",
        error: req.query.error
    });
});

type CompSuiteCategory = {
    Captions: {
        Name: string;
        Rank: number;
    }[]
}

type CompSuiteResult = {
    Categories: CompSuiteCategory[];
    DivisionName: string;
    Rank: number;
    GroupName: string;
    TotalScore: number;
}

type BandResult = {
    Name: string;
    Rank: number;
    Score: number;
}

type Result = {
    Bands: BandResult[];
    CaptionWinners: { [key: string]: string };
}

app.get("/:id", async (req, res) => {
    const data: CompSuiteResult[] = await fetch(`https://api.competitionsuite.com/2018-03/performances?c=${req.params.id}`).then(res => res.json());
    const divisions: Record<string, Result> = {};

    if ('Message' in data) {
        return res.redirect("/?error=Failed to find recap. Please make sure the link is correct!")
    }

    if (data.length == 0) {
        return res.redirect("/?error=Empty recap. Have you allowed programmatic access?");
    }

    data.forEach(el => {
        const bandResult: BandResult = {
            Name: el.GroupName,
            Rank: el.Rank,
            Score: el.TotalScore
        }

        if (el.DivisionName in divisions) {
            let inserted = false;

            for (let i = 0; i < divisions[el.DivisionName].Bands.length; i++) {
                if (el.Rank > divisions[el.DivisionName].Bands[i].Rank) {
                    divisions[el.DivisionName].Bands.splice(i, 0, bandResult);
                    inserted = true;
                    break;
                }
            }

            if (!inserted) {
                divisions[el.DivisionName].Bands.push(bandResult);
            }
        } else {
            divisions[el.DivisionName] = { Bands: [bandResult], CaptionWinners: {} };
        }

        if (Object.keys(divisions[el.DivisionName].CaptionWinners).length == 0) {
            el.Categories.forEach(cat => {
                cat.Captions.forEach(cap => {
                    divisions[el.DivisionName].CaptionWinners[cap.Name] = "";
                })
            });
        }

        el.Categories.forEach(cat => {
            cat.Captions.forEach(cap => {
                if (cap.Rank == 1) {
                    divisions[el.DivisionName].CaptionWinners[cap.Name] = el.GroupName;
                }
            })
        });
    });

    res.render("results", {
        title: "Results",
        results: divisions
    });
});

//final catch-all 404
app.use((_, res) => res.status(404).render("error", {
    title: "Not Found"
}));

const port = parseInt(process.env.PORT ?? "0");
app.listen(port, () => console.log(`Listening on port ${port}`));