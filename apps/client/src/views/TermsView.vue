<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="container mx-auto px-4 py-16 max-w-4xl">
      <div class="bg-white rounded-lg shadow-xl p-8">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p class="text-gray-600">Last updated: {{ new Date().toLocaleDateString() }}</p>
        </div>

        <div class="prose prose-gray max-w-none">
          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p class="text-gray-700 mb-4">
              By accessing and using EndowCast ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. 
              If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p class="text-gray-700 mb-4">
              EndowCast is a web-based endowment modeling and simulation platform that provides Monte Carlo analysis, 
              portfolio allocation tools, and financial projections for institutional investors and endowment managers.
            </p>
            <p class="text-gray-700 mb-4">
              The Service is provided on an "as is" and "as available" basis. We reserve the right to modify, 
              suspend, or discontinue the Service at any time without notice.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">3. User Accounts and Subscriptions</h2>
            <div class="space-y-4">
              <div>
                <h3 class="font-medium text-gray-900 mb-2">Account Registration</h3>
                <p class="text-gray-700">
                  You must provide accurate and complete information when creating an account. 
                  You are responsible for maintaining the confidentiality of your login credentials.
                </p>
              </div>
              <div>
                <h3 class="font-medium text-gray-900 mb-2">Subscription Plans</h3>
                <ul class="list-disc list-inside text-gray-700 space-y-1">
                  <li>Free Trial: 3 simulations, basic features</li>
                  <li>Professional: $39/month, 50 simulations per month</li>
                  <li>Institution: $149/month, 200 simulations per month</li>
                </ul>
              </div>
              <div>
                <h3 class="font-medium text-gray-900 mb-2">Billing and Payments</h3>
                <p class="text-gray-700">
                  Subscription fees are billed monthly in advance. All fees are non-refundable except as required by law. 
                  We reserve the right to change our pricing with 30 days' notice.
                </p>
              </div>
            </div>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
            <p class="text-gray-700 mb-4">You agree not to:</p>
            <ul class="list-disc list-inside text-gray-700 space-y-1 mb-4">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>Share your account credentials with others</li>
              <li>Attempt to reverse engineer, decompile, or extract the source code</li>
              <li>Use automated tools to access the Service beyond normal usage</li>
              <li>Upload malicious code or attempt to compromise the Service security</li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">5. Intellectual Property</h2>
            <p class="text-gray-700 mb-4">
              The Service and its original content, features, and functionality are and will remain the exclusive property of 
              EndowCast and its licensors. The Service is protected by copyright, trademark, and other laws.
            </p>
            <p class="text-gray-700 mb-4">
              You retain ownership of any data you input into the Service. By using the Service, you grant us a limited, 
              non-exclusive license to process your data solely for the purpose of providing the Service.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">6. Disclaimer of Warranties</h2>
            <p class="text-gray-700 mb-4">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. WE DISCLAIM ALL WARRANTIES, 
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, 
              AND NON-INFRINGEMENT.
            </p>
            <p class="text-gray-700 mb-4">
              <strong>Important:</strong> EndowCast is a modeling tool for educational and analytical purposes only. 
              The projections and simulations do not constitute financial advice. Always consult with qualified 
              financial professionals before making investment decisions.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">7. Limitation of Liability</h2>
            <p class="text-gray-700 mb-4">
              IN NO EVENT SHALL ENDOWCAST BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, 
              OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, 
              OR OTHER INTANGIBLE LOSSES.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">8. Termination</h2>
            <p class="text-gray-700 mb-4">
              We may terminate or suspend your account immediately, without prior notice, for conduct that we believe 
              violates these Terms of Service or is harmful to other users, us, or third parties.
            </p>
            <p class="text-gray-700 mb-4">
              You may cancel your subscription at any time. Upon cancellation, your access to paid features will 
              continue until the end of your current billing period.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">9. Changes to Terms</h2>
            <p class="text-gray-700 mb-4">
              We reserve the right to modify these terms at any time. We will notify users of significant changes 
              via email or through the Service. Continued use after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">10. Contact Information</h2>
            <p class="text-gray-700 mb-4">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-gray-700">
                <strong>Email:</strong> support@endowcast.com<br>
                <strong>Response Time:</strong> We aim to respond within 2 business days
              </p>
            </div>
          </section>
        </div>

        <div class="mt-12 pt-8 border-t border-gray-200">
          <div class="flex flex-col sm:flex-row gap-4">
            <router-link 
              to="/privacy" 
              class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              View Privacy Policy
            </router-link>
            <router-link 
              to="/" 
              class="inline-flex items-center px-4 py-2 bg-blue-800 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-900 transition-colors"
            >
              Return to Home
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// No additional logic needed for this static content page
</script>
