# PORTEXA-AI



# PORTEXA AI Portfolio Generator

PORTEXA is a static front-end for the PORTEXA FastAPI portfolio service.

## Pages

* `index.html` - landing page
* `login.html` - login mock flow
* `signup.html` - signup mock flow
* `Dashboard.html` - user dashboard
* `create.html` - portfolio builder form
* `templates.html` - template selection
* `preview.html` - selected theme preview, PDF print, and standalone HTML download
* `portfolios.html` - saved portfolio workspace
* `settings.html` - profile defaults

## Notes

The available themes include 3D Minimal and Mono Orbit. Run the backend from the Backend folder with `uvicorn main:app --reload --port 8000`, configure MySQL and `TOKEN_SECRET` as described in its README, and serve this folder from `http://localhost:5500` (for example with VS Code Live Server). `app.js` contains the API URL; update it for another deployment. The browser keeps a convenience copy of the current portfolio, while saved portfolios are stored by the API.
