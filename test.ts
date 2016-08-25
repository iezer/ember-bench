import { InitialRenderBenchmark, InitialRenderSamples, ITab, Runner } from "chrome-tracing";
import * as fs from "fs";

let browserOpts = process.env.CHROME_BIN ? {
  type: "exact",
  executablePath: process.env.CHROME_BIN
} : {
  type: "system"
};

const DATA = {
  "GET http://my.api.com/posts": {
    "posts": [
      {
        "id": 1,
        "title": "Rails is omakase",
        "body": "There are lots of à la carte software..."
      },
      {
        "id": 2,
        "title": "Ember is omakase",
        "body": "There are lots of à la carte software..."
      }
    ]
  }
};

class MyInitialRenderBenchmark extends InitialRenderBenchmark {
  constructor(name: string) {
    super({
      name,
      //      url: `http://localhost:9292/?tracing`,
      url: 'http://localhost.twitch.tv:9292/',
      markers: [
        { start: "domLoading", label: "load" },
      ],
      browser: browserOpts
    });
  }

  async warm(tab: ITab): Promise<void> {
    let id = await tab.addScriptToEvaluateOnLoad(`
      let data = JSON.parse(${JSON.stringify(DATA)});

      Object.keys(data).forEach(function(key) {
        window.localStorage.setItem(key, JSON.stringify(data[key]));
      });

      document.cookie = "/index-${this.name}.html";
    `);

    await tab.navigate('http://localhost:9292/404', true);

    await new Promise(resolve => setTimeout(resolve, 2500));

    await tab.removeScriptToEvaluateOnLoad(id);

    await tab.navigate(`http://localhost:9292/?cached`, true);

    await new Promise(resolve => setTimeout(resolve, 2500));

    await tab.navigate(`http://localhost:9292/?tracing`, true);
  }
}

new Runner(process.argv.slice(2).map(exp => new MyInitialRenderBenchmark(exp)))
.run(50)
.then(results => {
  results.forEach(result => {
    fs.writeFileSync(`results/${result.set}.json`, JSON.stringify(result))
  });
}).catch(err => {
  console.error(err.stack);
  process.exit(1);
});
