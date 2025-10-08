<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="container mx-auto px-4 py-16 max-w-4xl">
      <div class="bg-white rounded-lg shadow-xl p-8">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p class="text-gray-600">Last updated: {{ new Date().toLocaleDateString() }}</p>
        </div>

        <div class="prose prose-gray max-w-none">
          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p class="text-gray-700 mb-4">
              EndowCast ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains 
              how we collect, use, disclose, and safeguard your information when you use our endowment modeling service.
            </p>
            <p class="text-gray-700 mb-4">
              By using EndowCast, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <div class="space-y-4">
              <div>
                <h3 class="font-medium text-gray-900 mb-2">Personal Information</h3>
                <p class="text-gray-700 mb-2">When you register for an account, we collect:</p>
                <ul class="list-disc list-inside text-gray-700 space-y-1">
                  <li>Name and email address</li>
                  <li>Organization name (if applicable)</li>
                  <li>Payment information (processed securely through third-party providers)</li>
                  <li>Account preferences and settings</li>
                </ul>
              </div>

              <div>
                <h3 class="font-medium text-gray-900 mb-2">Usage Data</h3>
                <p class="text-gray-700 mb-2">We automatically collect:</p>
                <ul class="list-disc list-inside text-gray-700 space-y-1">
                  <li>IP address and browser information</li>
                  <li>Pages visited and features used</li>
                  <li>Time spent on the platform</li>
                  <li>Device and operating system information</li>
                  <li>Simulation parameters and usage statistics</li>
                </ul>
              </div>

              <div>
                <h3 class="font-medium text-gray-900 mb-2">Financial Modeling Data</h3>
                <p class="text-gray-700">
                  We collect and store the financial data you input for modeling purposes, including portfolio allocations, 
                  spending policies, and simulation parameters. This data is used solely to provide the modeling service.
                </p>
              </div>
            </div>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p class="text-gray-700 mb-4">We use your information to:</p>
            <ul class="list-disc list-inside text-gray-700 space-y-1 mb-4">
              <li>Provide and maintain the EndowCast service</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send important service notifications and updates</li>
              <li>Provide customer support</li>
              <li>Improve our service based on usage patterns</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p class="text-gray-700">
              <strong>We do not:</strong> Sell your personal information to third parties or use your financial modeling 
              data for any purpose other than providing the service to you.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
            
            <div class="space-y-4">
              <div>
                <h3 class="font-medium text-gray-900 mb-2">Service Providers</h3>
                <p class="text-gray-700">
                  We may share your information with trusted third-party service providers who assist us in operating 
                  our service, such as payment processors, hosting providers, and email services. These providers are 
                  bound by confidentiality agreements.
                </p>
              </div>

              <div>
                <h3 class="font-medium text-gray-900 mb-2">Legal Requirements</h3>
                <p class="text-gray-700">
                  We may disclose your information if required by law, court order, or government request, or to protect 
                  our rights, property, or safety.
                </p>
              </div>

              <div>
                <h3 class="font-medium text-gray-900 mb-2">Business Transfers</h3>
                <p class="text-gray-700">
                  In the event of a merger, acquisition, or sale of assets, your information may be transferred to the 
                  new entity, subject to the same privacy protections.
                </p>
              </div>
            </div>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p class="text-gray-700 mb-4">
              We implement appropriate technical and organizational measures to protect your information:
            </p>
            <ul class="list-disc list-inside text-gray-700 space-y-1 mb-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication</li>
              <li>Secure hosting infrastructure</li>
              <li>Regular backups and disaster recovery procedures</li>
            </ul>
            <p class="text-gray-700">
              However, no method of transmission over the internet is 100% secure. While we strive to protect your 
              information, we cannot guarantee absolute security.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
            <p class="text-gray-700 mb-4">
              We retain your information for as long as necessary to provide the service and comply with legal obligations:
            </p>
            <ul class="list-disc list-inside text-gray-700 space-y-1 mb-4">
              <li>Account information: Until you delete your account</li>
              <li>Financial modeling data: Until you delete it or your account</li>
              <li>Usage logs: Up to 2 years for service improvement</li>
              <li>Payment records: As required by law and payment processors</li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">7. Your Privacy Rights</h2>
            <p class="text-gray-700 mb-4">You have the right to:</p>
            <ul class="list-disc list-inside text-gray-700 space-y-1 mb-4">
              <li><strong>Access:</strong> Request copies of your personal information</li>
              <li><strong>Correction:</strong> Request corrections to inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Portability:</strong> Request transfer of your data to another service</li>
              <li><strong>Opt-out:</strong> Unsubscribe from non-essential communications</li>
            </ul>
            <p class="text-gray-700">
              To exercise these rights, contact us at privacy@endowcast.com. We will respond within 30 days.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">8. Cookies and Tracking</h2>
            <p class="text-gray-700 mb-4">
              We use cookies and similar technologies to:
            </p>
            <ul class="list-disc list-inside text-gray-700 space-y-1 mb-4">
              <li>Keep you logged in to your account</li>
              <li>Remember your preferences and settings</li>
              <li>Analyze how you use our service</li>
              <li>Provide personalized content</li>
            </ul>
            <p class="text-gray-700">
              You can control cookies through your browser settings, but disabling them may affect service functionality.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
            <p class="text-gray-700 mb-4">
              Your information may be transferred to and processed in countries other than your own. We ensure that 
              such transfers comply with applicable privacy laws and that appropriate safeguards are in place.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
            <p class="text-gray-700 mb-4">
              EndowCast is not intended for use by children under 16. We do not knowingly collect personal information 
              from children under 16. If you believe a child has provided us with personal information, please contact us.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">11. Changes to This Policy</h2>
            <p class="text-gray-700 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by email 
              or through the service. The updated policy will be effective when posted.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
            <p class="text-gray-700 mb-4">
              If you have questions about this Privacy Policy or our privacy practices, contact us:
            </p>
            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-gray-700">
                <strong>Privacy Inquiries:</strong> privacy@endowcast.com<br>
                <strong>General Support:</strong> support@endowcast.com<br>
                <strong>Response Time:</strong> We aim to respond within 2 business days
              </p>
            </div>
          </section>
        </div>

        <div class="mt-12 pt-8 border-t border-gray-200">
          <div class="flex flex-col sm:flex-row gap-4">
            <router-link 
              to="/terms" 
              class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              View Terms of Service
            </router-link>
            <router-link 
              to="/" 
              class="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 transition-colors"
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
