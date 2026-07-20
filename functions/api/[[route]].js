import app from '../_lib/app.js';

export const onRequest = (context) => app.fetch(context.request, context.env, context);
