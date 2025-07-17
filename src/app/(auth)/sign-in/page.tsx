"use client"

import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from '@/lib/auth-client'
import Link from 'next/link'
import React, { useState } from 'react'

export default function SignIn() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.target as HTMLFormElement);

    const { error } = await signIn.email({
      email: formData.get('email') as string,
      password: formData.get('pwd') as string,
    });

    try {
      if (error) {
        const errorMessage = error.message || 'An error occurred';
        
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      <form
        onSubmit={handleEmailSignIn}
        className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border p-0.5 shadow-md dark:[--color-muted:var(--color-zinc-900)]">
        <div className="p-8 pb-6">
          <div>
            <Link
              href="/"
              aria-label="go home">
              <Icons.logo
                className='h-12 w-12'
              />
            </Link>
            <h1 className="mb-1 mt-4 text-xl font-semibold">Sign In to MoneyMap</h1>
            <p className="text-sm">Welcome back! Sign in to continue</p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className='hover:text-primary-foreground'
              onClick={() => signIn.social({
                provider: "google",
                callbackURL: "/dashboard"
              })}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="0.98em"
                height="1em"
                viewBox="0 0 256 262">
                <path
                  fill="#4285f4"
                  d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"></path>
                <path
                  fill="#34a853"
                  d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"></path>
                <path
                  fill="#fbbc05"
                  d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"></path>
                <path
                  fill="#eb4335"
                  d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"></path>
              </svg>
              <span>Google</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className='hover:text-primary-foreground'  
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 1024 1024"
                id="facebook">
                <path
                  fill="#1877f2"
                  d="M1024,512C1024,229.23016,794.76978,0,512,0S0,229.23016,0,512c0,255.554,187.231,467.37012,432,505.77777V660H302V512H432V399.2C432,270.87982,508.43854,200,625.38922,200,681.40765,200,740,210,740,210V336H675.43713C611.83508,336,592,375.46667,592,415.95728V512H734L711.3,660H592v357.77777C836.769,979.37012,1024,767.554,1024,512Z"></path>
                <path
                  fill="#fff"
                  d="M711.3,660,734,512H592V415.95728C592,375.46667,611.83508,336,675.43713,336H740V210s-58.59235-10-114.61078-10C508.43854,200,432,270.87982,432,399.2V512H302V660H432v357.77777a517.39619,517.39619,0,0,0,160,0V660Z"></path>
              </svg>
              <span>Facebook</span>
            </Button>
          </div>

          <hr className="my-4 border-dashed" />

          <div className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="block text-sm">
                Email
              </Label>
              <Input
                type="email"
                required
                name="email"
                id="email"
              />
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="pwd"
                  className="text-title text-sm">
                  Password
                </Label>
                <Button
                  asChild
                  variant="link"
                  size="sm">
                  <Link
                    href="#"
                    className="link intent-info variant-ghost text-sm">
                    Forgot your Password ?
                  </Link>
                </Button>
              </div>
              <Input
                type="password"
                required
                name="pwd"
                id="pwd"
                className="input sz-md variant-mixed"
              />
            </div>

            {error && (
              <div className='text-error-400 text-sm my-4'>{error}</div>
            )}

            <Button
              className="w-full"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Signing in" : "Continue"}
            </Button>
          </div>
        </div>

        <div className="bg-muted rounded-(--radius) border p-3">
          <p className="text-muted-foreground text-center text-sm">
            {`Don't have an account?`}
            <Button
              asChild
              variant="link"
              className="px-2">
              <Link href="/sign-up">Create account</Link>
            </Button>
          </p>
        </div>
      </form>
    </section>
  )
}