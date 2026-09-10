// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Solo HTML/JS statici: i dati del foglio arrivano a runtime nel browser, mai al build.
  output: "static",
});
