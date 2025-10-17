

```markdown
# AI Nutrition Coach - Cloudflare Workers

A real-time AI-powered nutrition coaching application built with Cloudflare Workers, Durable Objects, and React. Get personalized meal recommendations, analyze meals, and track your nutrition goals.



## 🌟 Features

- **Real-time Chat Interface** - WebSocket-based communication with AI nutrition coach
- **Personalized Meal Recommendations** - Get meal suggestions based on your fitness goals and dietary preferences
- **Meal Analysis** - Analyze any meal for nutritional content (calories, protein, carbs, fat)
- **Goal Tracking** - Set and track daily calorie, protein targets, and fitness goals
- **Persistent Storage** - Your data is stored securely in Cloudflare Durable Objects
- **Clean Architecture** - Built with Domain-Driven Design principles and SOLID practices

## 🏗️ Architecture

This project follows Clean Architecture principles with clear separation of concerns:

```
src/
├── core/                    # Domain layer
│   ├── entities/           # Domain entities (UserProfile, NutritionContext, Message)
│   ├── interfaces/         # Port interfaces (ILLMProvider, IStateManager)
│   └── types/              # Type definitions
├── application/            # Application layer
│   ├── handlers/           # Message handlers (Chat, Command)
│   └── usecases/          # Business logic (AnalyzeMeal, GetRecommendations)
├── infrastructure/         # Infrastructure layer
│   ├── agent/             # Main agent (NutritionAgent - Durable Object)
│   ├── websocket/         # WebSocket connection handling
│   └── workflows/         # Background workflows (Reminders)
└── services/              # Services layer
    ├── llm/               # LLM integration (WorkersAI, PromptBuilder)
    ├── state/             # State management (DurableObjectStorage)
    └── nutrition/         # Nutrition logic (MealPlanner)
```

### Key Patterns Used

- **Clean Architecture** - Domain-driven design with clear boundaries
- **Dependency Injection** - Loose coupling via DI Container
- **Repository Pattern** - Abstract storage implementation
- **Chain of Responsibility** - Message handler chain
- **Facade Pattern** - Simplified service interfaces

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account (free tier works!)
- Git

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/cf-ai-nutrition-coach.git
cd cf-ai-nutrition-coach
```

2. **Install backend dependencies**

```bash
npm install
```

3. **Install frontend dependencies**

```bash
cd frontend
npm install
cd ..
```

4. **Login to Cloudflare**

```bash
npx wrangler login
```

5. **Run development server**

```bash
npm run dev
```

This will:
- Build TypeScript code
- Start Wrangler dev server on `http://127.0.0.1:8787`
- Connect to Cloudflare Workers AI (will incur minimal usage charges)

6. **Run frontend (in a separate terminal)**

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173` (or the port shown in terminal).

## 🎮 Usage

### Setting Goals

1. Click the "Set Goals" button in the header
2. Enter your daily calorie and protein targets
3. Select your fitness goal (Weight Loss, Muscle Gain, or Maintenance)
4. Add any dietary restrictions
5. Click "Save Goals"

### Getting Meal Recommendations

Simply type in the chat:
```
recommend me meals
```

You'll get 3 personalized meal suggestions based on your goals!

### Analyzing a Meal

Describe any meal you're eating:
```
analyze grilled chicken with quinoa and broccoli
```

Get detailed nutritional breakdown and health insights.

### General Questions

Ask anything about nutrition:
```
how to make chicken burger
what are good protein sources
is it okay to eat carbs at night
```

## 📡 API Endpoints

### WebSocket
- `ws://127.0.0.1:8787/ws?userId=YOUR_USER_ID` - Real-time chat

### REST API
- `GET /health` - Health check
- `POST /api/analyze` - Analyze meal (REST alternative)
- `POST /api/recommendations` - Get recommendations (REST alternative)

## 🛠️ Technology Stack

### Backend
- **Cloudflare Workers** - Serverless compute platform
- **Durable Objects** - Stateful serverless with WebSocket support
- **Workers AI** - Built-in AI models (@cf/meta/llama-3.1-8b-instruct)
- **TypeScript** - Type-safe development

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Vite** - Build tool

### Architecture Patterns
- Clean Architecture
- Domain-Driven Design (DDD)
- SOLID Principles
- Dependency Injection
- Repository Pattern

## 📝 Project Structure

```
cf-ai-nutrition-coach/
├── src/                          # Backend source code
│   ├── core/                     # Domain layer
│   │   ├── entities/            # UserProfile, Message, NutritionContext
│   │   ├── interfaces/          # ILLMProvider, IStateManager, etc.
│   │   ├── types/               # Type definitions
│   │   └── DIContainer.ts       # Dependency injection container
│   ├── application/             # Application layer
│   │   ├── handlers/            # ChatMessageHandler, CommandHandler
│   │   └── usecases/            # AnalyzeMealUseCase, GetRecommendationsUseCase
│   ├── infrastructure/          # Infrastructure layer
│   │   ├── agent/               # NutritionAgent (main Durable Object)
│   │   ├── websocket/           # ConnectionHandler
│   │   └── workflows/           # ReminderWorkflow
│   ├── services/                # Services layer
│   │   ├── llm/                 # LLMService, WorkersAIProvider, PromptBuilder
│   │   ├── state/               # StateService, DurableObjectStorage
│   │   └── nutrition/           # MealPlanner
│   └── index.ts                 # Main entry point
├── frontend/                     # Frontend React app
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── hooks/               # useWebSocket hook
│   │   └── types/               # TypeScript types
│   └── package.json
├── wrangler.toml                # Cloudflare Workers configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Backend dependencies
```

## 🔧 Configuration

### Backend Configuration

**File: `wrangler.toml`**

```toml
name = "cf-ai-nutrition-coach"
main = "dist/index.js"
compatibility_date = "2024-01-01"

[ai]
binding = "AI"

[[durable_objects.bindings]]
name = "NUTRITION_AGENT"
class_name = "NutritionAgentDO"
script_name = "cf-ai-nutrition-coach"

[[migrations]]
tag = "v1"
new_classes = ["NutritionAgentDO"]
```

### Frontend Configuration

**File: `frontend/.env`**

```env
VITE_WS_URL=ws://127.0.0.1:8787
VITE_API_URL=http://127.0.0.1:8787
```

## 🚢 Deployment

### Deploy to Cloudflare

1. **Build the project**

```bash
npm run build
```

2. **Deploy to Cloudflare**

```bash
npx wrangler deploy
```

3. **Deploy frontend** (to Cloudflare Pages or your preferred hosting)

```bash
cd frontend
npm run build
# Deploy the 'dist' folder to your hosting provider
```

## 🐛 Troubleshooting

### WebSocket Connection Issues

If WebSocket connections fail:
1. Check that `wrangler dev` is running
2. Verify the WebSocket URL in `frontend/.env` matches your dev server
3. Complete OAuth authentication when prompted

### OAuth Authentication Timeout

When running `wrangler dev`, a browser window will open for authentication:
1. Complete the authorization within 2 minutes
2. If it times out, restart `npm run dev`
3. Alternatively, run `npx wrangler login` first

### "Unknown User" in Logs

This happens when multiple Durable Object instances are created. It's normal in development and doesn't affect functionality.

## 📚 Key Files Explained

### Backend

- **`src/index.ts`** - Main entry point, exports Durable Object and fetch handler
- **`src/infrastructure/agent/NutritionAgent.ts`** - Main agent coordinating all components
- **`src/infrastructure/websocket/ConnectionHandler.ts`** - Manages WebSocket connections
- **`src/services/llm/PromptBuilder.ts`** - Constructs prompts for AI
- **`src/core/DIContainer.ts`** - Dependency injection container

### Frontend

- **`frontend/src/App.tsx`** - Main React component
- **`frontend/src/hooks/useWebSocket.ts`** - WebSocket connection hook
- **`frontend/src/components/ChatInterface.tsx`** - Chat UI component
- **`frontend/src/components/GoalsDialog.tsx`** - Goals setting dialog

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Cloudflare Workers](https://workers.cloudflare.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- AI powered by [Workers AI](https://developers.cloudflare.com/workers-ai/)

## 📞 Support

If you have any questions or run into issues:
- Open an issue on GitHub
- Check Cloudflare Workers documentation: https://developers.cloudflare.com/workers/

## 🎯 Future Enhancements

- [ ] Meal logging and tracking
- [ ] Daily nutrition progress dashboard
- [ ] Meal history and favorites
- [ ] Recipe suggestions with instructions
- [ ] Integration with fitness trackers
- [ ] Social features (share meals, follow friends)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics and insights

---

Built with ❤️ using Cloudflare Workers and React
```
