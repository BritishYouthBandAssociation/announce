import express from 'express';
import 'dotenv/config';
import { engine } from 'express-handlebars';

const app = express();

app.engine("hbs", engine({ extname: ".hbs" }));
app.set("view engine", "hbs");

app.use(express.static("public"));

app.get("/", (_, res) => {
    res.render("home", {
        title: "Results Viewer"
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

            for(let i = 0; i < divisions[el.DivisionName].Bands.length; i++){
                if(el.Rank < divisions[el.DivisionName].Bands[i].Rank){
                    divisions[el.DivisionName].Bands.splice(i, 0, bandResult);
                    inserted = true;
                    break;
                }
            }

            if(!inserted){
                divisions[el.DivisionName].Bands.push(bandResult);
            }
        } else {
            divisions[el.DivisionName] = { Bands: [bandResult], CaptionWinners: {} };
        }

        el.Categories.forEach(cat => {
            cat.Captions.forEach(cap => {
                if(cap.Rank == 1){
                    divisions[el.DivisionName].CaptionWinners[cap.Name] = el.GroupName;
                }
            })
        });
    });

    return res.json(divisions);
});

//final catch-all 404
app.use((_, res) => res.status(404).render("error", {
    title: "Not Found"
}));

const port = parseInt(process.env.PORT ?? "0");
app.listen(port, () => `Listening on port ${port}`);