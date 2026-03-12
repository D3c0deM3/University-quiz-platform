package com.unitest.secureapp

import android.content.Intent
import android.os.Bundle
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
  private lateinit var webView: WebView

  private fun applySecureFlag() {
    window.setFlags(
      WindowManager.LayoutParams.FLAG_SECURE,
      WindowManager.LayoutParams.FLAG_SECURE,
    )
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    applySecureFlag()
    setContentView(R.layout.activity_main)

    webView = findViewById(R.id.webView)
    configureWebView(webView)

    if (savedInstanceState == null) {
      webView.loadUrl(BuildConfig.BASE_URL)
    } else {
      webView.restoreState(savedInstanceState)
    }
  }

  override fun onResume() {
    super.onResume()
    applySecureFlag()
  }

  override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
    webView.saveState(outState)
  }

  @Deprecated("Deprecated in Java")
  override fun onBackPressed() {
    if (webView.canGoBack()) {
      webView.goBack()
      return
    }
    super.onBackPressed()
  }

  private fun configureWebView(view: WebView) {
    val settings = view.settings
    settings.javaScriptEnabled = true
    settings.domStorageEnabled = true
    settings.cacheMode = WebSettings.LOAD_DEFAULT
    settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
    settings.userAgentString = "${settings.userAgentString} UniTestSecureAndroid/1.0"

    view.setOnLongClickListener { true }
    view.isLongClickable = false
    view.hapticFeedbackEnabled = false

    CookieManager.getInstance().setAcceptCookie(true)
    CookieManager.getInstance().setAcceptThirdPartyCookies(view, true)

    view.webViewClient = object : WebViewClient() {
      override fun shouldOverrideUrlLoading(
        webView: WebView?,
        request: WebResourceRequest?,
      ): Boolean {
        val uri = request?.url ?: return false
        val host = uri.host?.lowercase() ?: return false
        val isUniTestHost = host == "unitest.systems" || host.endsWith(".unitest.systems")
        if (isUniTestHost) return false

        startActivity(Intent(Intent.ACTION_VIEW, uri))
        return true
      }
    }
  }
}
