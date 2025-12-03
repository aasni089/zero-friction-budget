'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  MessageSquare,
  Users,
  TrendingUp,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  // Landing page - don't redirect authenticated users
  // They should manually navigate to the app

  // Show landing page content (middleware may also redirect, but this provides smooth UX)
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img src="/logo.svg" alt="Logo" className="h-12 w-12" />
              <span className="text-xl font-bold">Zero Friction Budget</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/login">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-8">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              Track Household Expenses
              <span className="block text-primary mt-2">Together</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto">
              Simple budgeting, powerful insights for families. Real-time
              collaboration that keeps everyone on the same page.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/login">
                <Button size="lg" className="text-lg px-8 py-6">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <p className="text-sm text-gray-500">
                Free to start • No credit card required
              </p>
            </div>
          </div>

          {/* Hero Image/Illustration Placeholder */}
          <div className="mt-16 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-8 border shadow-2xl">
            <div className="aspect-video bg-white/50 rounded-lg flex items-center justify-center">
              <p className="text-gray-400 text-lg">Dashboard Preview</p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
            Why families love Zero Friction Budget
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                ChatGPT-style Input
              </h3>
              <p className="text-gray-600">
                Add expenses in seconds with our intuitive, chat-like interface.
                No complex forms, just type and go.
              </p>
            </Card>

            {/* Feature 2 */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Real-time Collaboration
              </h3>
              <p className="text-gray-600">
                See updates instantly when household members add expenses.
                Everyone stays in sync.
              </p>
            </Card>

            {/* Feature 3 */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Budgeting</h3>
              <p className="text-gray-600">
                Visual budget tracking with color-coded progress. Know exactly
                where you stand at a glance.
              </p>
            </Card>

            {/* Feature 4 */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
              <p className="text-gray-600">
                Your data is encrypted and isolated. Bank-grade security keeps
                your finances safe.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            Get started in 3 simple steps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Create your household
              </h3>
              <p className="text-gray-600">
                Set up your household and invite family members with a simple
                email invitation.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">Set budgets</h3>
              <p className="text-gray-600">
                Define monthly spending limits for groceries, entertainment, and
                more.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Track expenses</h3>
              <p className="text-gray-600">
                Add expenses instantly and see real-time progress towards your
                budget goals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary/5">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-8">
            Trusted by households everywhere
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-primary mb-2">500+</div>
              <p className="text-gray-600">Active Households</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-primary mb-2">
                $100K+
              </div>
              <p className="text-gray-600">Expenses Tracked</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-primary mb-2">4.9/5</div>
              <p className="text-gray-600">User Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to take control of your household budget?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join hundreds of families already tracking their expenses with Zero
            Friction Budget.
          </p>
          <Link href="/login">
            <Button size="lg" className="text-lg px-8 py-6">
              Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="#" className="hover:text-primary">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="#" className="hover:text-primary">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="#" className="hover:text-primary">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="#" className="hover:text-primary">
                    Twitter
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary">
                    GitHub
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary">
                    LinkedIn
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-gray-600">
            <p>
              © {new Date().getFullYear()} Zero Friction Budget. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
