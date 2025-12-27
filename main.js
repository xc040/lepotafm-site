package com.lepotafm.radio; // ⚠️ ПРОВЕРЬ: Если у тебя папка называется иначе, исправь эту строку!

import android.content.Context;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;

// Библиотеки плеера (ExoPlayer)
import com.google.android.exoplayer2.ExoPlayer;
import com.google.android.exoplayer2.MediaItem;
import com.google.android.exoplayer2.PlaybackException;
import com.google.android.exoplayer2.Player;
import com.google.android.exoplayer2.DefaultLoadControl;
import com.google.android.exoplayer2.upstream.DefaultAllocator;
import com.google.android.exoplayer2.source.DefaultMediaSourceFactory;
import com.google.android.exoplayer2.upstream.DefaultHttpDataSource;

public class MainActivity extends AppCompatActivity {

    private WebView myWebView; // Это ЭКРАН (Твой сайт)
    private ExoPlayer player;  // Это ЗВУК (Мотор приложения)

    // 👇 ТВОИ ССЫЛКИ
    // Ссылка на твой сайт на GitHub. Добавляем ?app=true, чтобы сайт знал, что открыт в приложении
    private String siteUrl = "https://xc040.github.io/lepotafm-site/?app=true";
    
    // Ссылка на поток (Музыка)
    private String streamUrl = "https://lepotafm.ru/listen/lepotafm/radio.mp3";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // 1. Сначала готовим звук
        setupNativePlayer(); 
        
        // 2. Потом показываем картинку (сайт)
        setupWebView();      
    }

    // --- НАСТРОЙКА ЭКРАНА (Сайт) ---
    private void setupWebView() {
        myWebView = findViewById(R.id.myWebView);
        WebSettings webSettings = myWebView.getSettings();
        webSettings.setJavaScriptEnabled(true); // Разрешаем скрипты
        webSettings.setDomStorageEnabled(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false); 

        // 🔥 ВОТ ЭТО "МОСТ": Позволяет сайту управлять плеером приложения
        myWebView.addJavascriptInterface(new WebAppInterface(this), "Android");

        myWebView.setWebViewClient(new WebViewClient());
        myWebView.loadUrl(siteUrl);
    }

    // --- НАСТРОЙКА ЗВУКА (ExoPlayer) ---
    private void setupNativePlayer() {
        // Настройка буфера для мгновенного старта (0.5 сек)
        DefaultLoadControl loadControl = new DefaultLoadControl.Builder()
                .setAllocator(new DefaultAllocator(true, 16))
                .setBufferDurationsMs(10000, 50000, 500, 2000)
                .build();

        // Настройка загрузчика (разрешаем редиректы для Cloudflare)
        DefaultHttpDataSource.Factory httpDataSourceFactory = new DefaultHttpDataSource.Factory()
                .setAllowCrossProtocolRedirects(true)
                .setUserAgent("LepotaFM-App");

        // Создаем плеер
        player = new ExoPlayer.Builder(this)
                .setMediaSourceFactory(new DefaultMediaSourceFactory(httpDataSourceFactory))
                .setLoadControl(loadControl)
                .build();
        
        // Загружаем ссылку на радио
        MediaItem mediaItem = MediaItem.fromUri(streamUrl);
        player.setMediaItem(mediaItem);
        player.prepare();
        player.setPlayWhenReady(true); // Автостарт при запуске приложения
        
        // Перезапуск при обрыве связи
        player.addListener(new Player.Listener() {
            @Override
            public void onPlayerError(PlaybackException error) {
                player.setPlayWhenReady(false);
                // Пробуем снова через 3 секунды
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    if (player != null) {
                        player.setMediaItem(mediaItem);
                        player.prepare();
                        player.setPlayWhenReady(true);
                    }
                }, 3000);
            }
        });
    }

    // --- КОМАНДЫ С САЙТА ---
    // Когда ты жмешь кнопку на сайте, срабатывает этот код в Java
    public class WebAppInterface {
        Context mContext;
        WebAppInterface(Context c) { mContext = c; }

        @JavascriptInterface
        public void playAudio() {
            new Handler(Looper.getMainLooper()).post(() -> {
                if (player != null) {
                    player.setPlayWhenReady(true);
                }
            });
        }

        @JavascriptInterface
        public void pauseAudio() {
            new Handler(Looper.getMainLooper()).post(() -> {
                if (player != null) player.setPlayWhenReady(false);
