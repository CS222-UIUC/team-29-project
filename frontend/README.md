# ThreadFlow Frontend

A Next.js 15 application with React 19 for the ThreadFlow chat interface.

## Features

- Modern, responsive UI built with Next.js and Tailwind CSS
- Multiple AI model selection from different providers:
  - Google's Gemini models
  - Anthropic's Claude models
  - OpenAI's GPT models
- Real-time model availability detection
- Error handling and timeout management

## Getting Started

First, run the development server:

```bash
npm run dev
```

Or with Docker (recommended for full-stack development):

```bash
DOCKER_BUILDKIT=1 docker-compose up --build
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development Notes

- The chat interface is implemented in `src/app/chat/page.tsx`
- API calls are made to the backend at `http://localhost:8000`
- The frontend automatically detects which models are available based on API keys configured in the backend

## Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend API URL (defaults to http://backend:8000 in Docker)

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)

## Deploy on Vercel

The easiest way to deploy this Next.js app is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.
