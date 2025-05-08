# ThreadFlow Frontend

A modern, friendly chat interface built with Next.js 15 and React 19.

## ✨ What's included

- **Beautiful UI** built with Next.js and Tailwind CSS
- **Multiple AI models** at your fingertips:
  - Google's Gemini models
  - Anthropic's Claude models
  - OpenAI's GPT models
- **Smart model detection** - only shows what's available
- **Robust error handling** so things don't break

## 🏗️ Technical Architecture

The ThreadFlow frontend is built with modern web technologies for a responsive, accessible user experience:

### Core Technologies

- **Next.js 15**: React framework with built-in routing and server components
- **React 19**: Component-based UI library with concurrent rendering
- **Tailwind CSS**: Utility-first CSS framework for consistent styling
- **TypeScript**: Static type checking for reliable code

### Key Features

- **Model Switching**: Seamlessly change between different AI providers
- **Conversation History**: Maintain chat history across model switches
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Authentication**: Secure login with NextAuth.js
- **Error Boundaries**: Graceful handling of API failures

### State Management

- React Context API for application state
- Custom hooks for shared logic
- Type-safe data handling with TypeScript interfaces

## 🚀 Installation and Setup

### Prerequisites

- Node.js 20.x+
- npm or yarn

### Environment Setup

Create a `.env.local` file with:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Development Server

Run the development server:

```bash
npm install
npm run dev
```

Or use Docker (recommended for the full experience):

```bash
DOCKER_BUILDKIT=1 docker-compose up --build
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧩 Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── chat/         # Chat page components
│   │   ├── auth/         # Authentication pages
│   │   └── layout.tsx    # Root layout component
│   ├── __tests__/        # Test files
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions and helpers
│       ├── apiClient.ts  # API communication
│       └── modelUtils.ts # Model handling logic
```

## 🧪 Testing

We use Jest and React Testing Library for thorough testing:

- **Unit Tests**: For utility functions and hooks
- **Component Tests**: For individual UI components
- **Integration Tests**: For page interactions
- **Mock Service Worker**: For API mocking

Run tests with:

```bash
npm test
```

## 📱 Responsive Design

ThreadFlow adapts to different screen sizes:

- **Desktop**: Full-featured experience with side panels
- **Tablet**: Optimized layout with collapsible sections
- **Mobile**: Streamlined interface for on-the-go usage

## 🚀 Deployment

The frontend can be deployed as:

- A static export to any hosting service
- A serverless application on Vercel
- A containerized app using our Docker configuration

## 🔗 API Integration

The frontend connects to our backend API using:

- Fetch API for network requests
- JWT authentication for secure communication
- TypeScript interfaces for type-safe data handling
