import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, BookOpen, Calendar, Trophy, Calculator } from "lucide-react";
import { Link } from "react-router-dom";

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">EduManage Pro</span>
            </div>
            <Link to="/login">
              <Button>Login</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-8">
            Complete School Management
            <span className="text-primary block mt-2">Made Simple</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            Streamline your educational institution with our comprehensive ERP solution. 
            Manage students, faculty, attendance, results, fees, and more from one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button size="lg" className="px-8">
                Get Started
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="px-8">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-muted-foreground">
              Comprehensive tools for modern educational management
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Student Management</CardTitle>
                <CardDescription>
                  Complete student profiles, enrollment, and academic tracking
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Attendance Tracking</CardTitle>
                <CardDescription>
                  Real-time attendance monitoring with detailed reports
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Results Management</CardTitle>
                <CardDescription>
                  Grade tracking, report cards, and performance analytics
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Calculator className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Fee Management</CardTitle>
                <CardDescription>
                  Online payments, fee tracking, and financial reporting
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Library System</CardTitle>
                <CardDescription>
                  Digital library management with book tracking
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <GraduationCap className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Faculty Portal</CardTitle>
                <CardDescription>
                  Teacher dashboard for assignments, grades, and attendance
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/10">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-foreground mb-8">
            Ready to Transform Your School?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of educational institutions already using EduManage Pro
          </p>
          <Link to="/login">
            <Button size="lg" className="px-12">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">EduManage Pro</span>
            </div>
            <p className="text-muted-foreground text-center md:text-right">
              © 2025 EduManage Pro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}