# GitHub Pages deployment — Resume

This folder is the website root. Upload the **contents** of this folder to the root of your `Resume` GitHub repository. Do not upload the enclosing folder or the original RAR.

1. Open GitHub and select the `Resume` repository.
2. Choose **Add file → Upload files** and upload `index.html`, all CSS and JS files, `.nojekyll`, and the **assets** folder with its contents. GitHub's browser uploader may not preserve folders when dragging individual files; use GitHub Desktop or Git to reliably upload the folder structure.
3. Commit to `main`.
4. Go to **Settings → Pages → Build and deployment**; select **Deploy from a branch**, branch `main`, folder `/(root)`, and Save.
5. Visit https://kerbyjamespajaron0.github.io/Resume/ after the deployment finishes. Hard-refresh if you still see cached broken images.

To upload with Git (from inside this folder):

```bash
git init
git branch -M main
git add .
git commit -m "Deploy One Piece portfolio"
git remote add origin https://github.com/kerbyjamespajaron0/Resume.git
git push -u origin main
```

If the repository already contains files, clone it first and copy this folder's contents into the clone instead of force-pushing.

## Images

Image references are relative (e.g. `assets/kerby-professional.webp`), so they work under the `/Resume/` GitHub Pages project path. Do not rename `assets` or change filename capitalization.

## Audio and publishing rights

The included `assets/we-are-intro.mp3` was provided with the original project. Publishing copyrighted music or character artwork on a public site may require permission. Remove or replace material you do not have permission to publish. Browsers may block sound autoplay until the visitor interacts with the page.
