# AI Agency Pro - AI Mentorship Platform

A comprehensive web-based learning platform designed to help web agencies learn how to replace bloated teams with AI-powered workflows. Built with React, TypeScript, and shadcn/ui.

## 🚀 Overview

AI Agency Pro is a mentorship platform that teaches web agency owners how to:
- Use AI tools like Cursor, GPT, Claude, and automation
- Cut operational costs by 80%
- Scale efficiently without hiring more people
- Replace manual tasks with smart AI workflows

## ✨ Features

### 🎯 Core Features
- **Landing Page** - Compelling value proposition and conversion-focused design
- **Authentication** - Secure login/signup system (ready for Supabase integration)
- **Dashboard** - Progress tracking, course overview, and stats
- **Course System** - Detailed courses with lessons, progress tracking, and resources
- **AI Tools Library** - Downloadable templates, prompts, and automation scripts
- **Progress Tracking** - Goals, achievements, and learning analytics

### 🛠 Technical Features
- Modern React with TypeScript
- Responsive design with Tailwind CSS
- Beautiful UI components with shadcn/ui
- Smooth animations with Framer Motion
- State management with React Query
- Routing with React Router
- Ready for Supabase backend integration

## 🏗 Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   └── Welcome.tsx      # Landing page component
├── pages/
│   ├── Index.tsx        # Home page
│   ├── Login.tsx        # Authentication pages
│   ├── Signup.tsx
│   ├── Dashboard.tsx    # Main user dashboard
│   ├── Course.tsx       # Individual course detail
│   └── NotFound.tsx     # 404 page
├── lib/
│   ├── utils.ts         # Utility functions
│   └── supabase.ts      # Database configuration
├── hooks/
│   └── use-toast.ts     # Toast notifications
└── App.tsx              # Main app with routing
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or bun

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ai-agency-pro
   ```

2. **Install dependencies**
   ```bash
npm install
   # or
   bun install
```

3. **Start the development server**
   ```bash
npm run dev
   # or
   bun dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

## 📱 Pages & Features

### Landing Page (`/`)
- Hero section with clear value proposition
- Problem/solution framework
- Feature highlights
- Social proof and testimonials
- Call-to-action for signup

### Authentication (`/login`, `/signup`)
- Clean, professional login/signup forms
- Form validation and error handling
- Demo credentials for testing
- Ready for Supabase auth integration

### Dashboard (`/dashboard`)
- Welcome section with user stats
- Course progress overview
- Recent activity feed
- Tabbed navigation for:
  - Overview
  - Courses
  - AI Tools
  - Progress & Goals

### Course Detail (`/course/:id`)
- Course information and instructor bio
- Lesson curriculum with progress tracking
- Downloadable resources
- Community section (coming soon)

## 🎨 Design System

### Color Scheme
- Primary: Blue (#3B82F6)
- Secondary: Gray (#6B7280)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Error: Red (#EF4444)

### Typography
- Headings: Inter font family
- Body: System font stack
- Code: Monospace

### Components
All UI components use shadcn/ui for consistency:
- Buttons, Cards, Forms
- Navigation, Tabs, Progress bars
- Modals, Toasts, Tooltips

## 🔧 Customization

### Adding New Courses
1. Update the course data in `Dashboard.tsx`
2. Create corresponding course detail pages
3. Add navigation links

### Integrating Supabase
1. Update environment variables in `supabase.ts`
2. Replace mock authentication in login/signup pages
3. Connect dashboard data to real database

### Styling
- Modify `tailwind.config.ts` for theme customization
- Update component styles in individual files
- Use CSS variables for consistent theming

## 🚀 Deployment

### Build for Production
```bash
npm run build
# or
bun run build
```

### Deploy Options
- **Vercel** (Recommended)
- **Netlify**
- **AWS S3 + CloudFront**
- **Traditional hosting**

## 📋 Next Steps

### Phase 1: MVP
- [x] Landing page and core navigation
- [x] Authentication pages
- [x] Dashboard with course overview
- [x] Course detail pages
- [ ] Supabase integration
- [ ] User progress tracking

### Phase 2: Enhanced Features
- [ ] Video lesson player
- [ ] Real-time progress updates
- [ ] Community features
- [ ] Payment integration
- [ ] Admin dashboard

### Phase 3: Advanced Features
- [ ] AI-powered recommendations
- [ ] Live mentorship calls
- [ ] Certificate generation
- [ ] Mobile app

## 💰 Business Model

### Revenue Streams
1. **Monthly Subscriptions** - $97/month for full access
2. **Annual Plans** - $997/year (2 months free)
3. **Enterprise** - Custom pricing for agencies with 10+ people
4. **One-time Courses** - $197-$497 per specialized course

### Target Market
- Web agency owners (1-50 employees)
- Freelance web developers looking to scale
- Digital marketing agencies
- SaaS companies needing content

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary. All rights reserved.

## 📞 Support

For questions or support:
- Email: support@aiagencypro.com
- Documentation: [Link to docs]
- Community: [Link to Discord/Slack]

---

**Built with ❤️ for the future of web agencies**
