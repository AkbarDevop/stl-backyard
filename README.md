# STL Backyard

STL Backyard is a polished static starter site for free and affordable summer events around St. Louis. It uses plain HTML, CSS, JavaScript, and a local JSON file. No build system, API key, or map service is required.

## Files

- `index.html` - page structure
- `styles.css` - responsive visual design
- `app.js` - filters, card rendering, map pins, curated sections
- `data/events.json` - editable starter event data
- `assets/stl-backyard-hero.png` - generated local hero artwork

## Editing Events

Open `data/events.json` and edit the `events` array. Each event should include:

- `title`, `category`, `startDate`, `time`, `venue`, `neighborhood`
- `priceLabel`, `priceMin`, `priceMax`
- `whyGo`, `description`, `link`
- `sourceName`, `sourceUrl`, `status`
- `goodFor` tags such as `families`, `date night`, `outdoors`, `rainy day`

Supported categories are:

`music`, `outdoors`, `museums`, `movies`, `sports`, `food`, `arts`, `community`

Use `status: "source-confirmed"` only when the listing's main details are backed by a current source. Use `status: "starter-demo-verify"` when the idea is useful but the exact date, time, price, weather plan, or ticket rule needs manual confirmation.

## Local Preview

Because `app.js` fetches `data/events.json`, preview through a tiny static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploying

### GitHub Pages

1. Push this directory to a GitHub repository.
2. In the repository, go to Settings -> Pages.
3. Choose the branch that contains these files.
4. Keep the source folder as `/root`.
5. Save and wait for the Pages URL.

### Netlify

1. Create a new Netlify site from the repository, or drag the folder into Netlify Drop.
2. Leave the build command blank.
3. Set the publish directory to the project root.
4. Deploy.

## Data Note

The bundled events are starter/demo listings assembled from public St. Louis event sources where possible. They are meant to make the website feel real and useful, not to replace a maintained calendar. Verify every listing before sharing it publicly or heading out.
