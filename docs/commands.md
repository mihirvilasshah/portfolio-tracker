# Terminal commands

## Create Expo App with Router
```bash
npx create-expo-app@latest -e with-router
```

## Run the App
```bash
npx expo start
```

## For Cursor
`spec.md` - ChatGPT

`context.md` - Perplexity

### In Cursor's context window, start with:

1. Load spec.md first (smaller, focused)
2. Reference architecture diagram from spec.md
3. Follow Sprint 0 → Sprint 1 implementation
4. When integrating APIs, pull specific sections from CONTEXT.md

### Example Cursor prompt:
"Build Sprint 0 using spec.md: setup Supabase, Expo, TypeScript, 
implement basic auth and dashboard skeleton. Reference the database 
schema from section 5 and navigation structure from section 7."
