package com.lepotafm.radio; // ⚠️ ПРОВЕРЬ ИМЯ ПАКЕТА

import android.content.Context;
import android.graphics.Color;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.exoplayer2.C;
import com.google.android.exoplayer2.DefaultLoadControl;
import com.google.android.exoplayer2.ExoPlayer;
import com.google.android.exoplayer2.MediaItem;
import com.google.android.exoplayer2.PlaybackException;
import com.google.android.exoplayer2.Player;
import com.google.android.exoplayer2.audio.AudioAttributes;
import com.google.android.exoplayer2.source.DefaultMediaSourceFactory;
import com.google.android.exoplayer2.upstream.DefaultAllocator;
import com.google.android.exoplayer2.upstream.DefaultHttpDataSource;

public class MainActivity extends AppCompatActivity {

    // --- НАСТРОЙКИ ---
    private String siteUrl = "https://xc040.github.io/lepotafm-site/?app=true";
    private String streamUrl = "https://lepotafm.ru/listen/lepotafm/radio.mp3";
    private boolean isPaidUser = true;

    private WebView myWebView;
    private ExoPlayer player;
    private PowerManager.WakeLock wakeLock;
    private float currentVolume = 1.0f;
    
    // Переменные для контроля фокуса
    private boolean isActivityVisible = true;
    private AudioManager audioManager;
    private AudioManager.OnAudioFocusChangeListener focusChangeListener;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LepotaFM:RadioWakeLock");
            wakeLock.acquire();
        }

        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        
        // 1. Настраиваем "Наглый" фокус
        setupAudioFocus();

        // 2. Запускаем плеер
        setupNativePlayer();

        // 3. Запускаем игру
        setupWebView();
    }

    private void setupAudioFocus() {
        focusChangeListener = focusChange -> {
            // Если фокус потерян (игра запустилась или звонок)
            if (focusChange == AudioManager.AUDIOFOCUS_LOSS || 
                focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT ||
                focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
                
                // ГЛАВНЫЙ ХАК:
                if (isActivityVisible) {
                    // Если мы ВНУТРИ приложения (играем), а звук пытается пропасть:
                    // МЫ ЕГО ВОЗВРАЩАЕМ! Игнорируем требование системы заткнуться.
                    if (player != null && !player.isPlaying()) {
                        player.setPlayWhenReady(true);
                    }
                } else {
                    // Если мы СВЕРНУЛИ приложение (YouTube, Звонок):
                    // Честно ставим паузу.
                    if (player != null && player.isPlaying()) {
                        player.setPlayWhenReady(false);
                    }
                }
            } 
            // Если фокус вернулся (закончили звонок)
            else if (focusChange == AudioManager.AUDIOFOCUS_GAIN) {
                if (player != null && !player.isPlaying()) {
                    player.setPlayWhenReady(true);
                }
            }
        };
    }

    private void requestAudioFocus() {
        // Запрашиваем право на звук
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioFocusRequest request = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setOnAudioFocusChangeListener(focusChangeListener)
                    .build();
            audioManager.requestAudioFocus(request);
        } else {
            audioManager.requestAudioFocus(focusChangeListener, 
                    AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        }
    }

    private void setupNativePlayer() {
        DefaultLoadControl loadControl = new DefaultLoadControl.Builder()
                .setAllocator(new DefaultAllocator(true, 16))
                .setBufferDurationsMs(10000, 50000, 500, 2000)
                .build();

        DefaultHttpDataSource.Factory httpDataSourceFactory = new DefaultHttpDataSource.Factory()
                .setAllowCrossProtocolRedirects(true)
                .setUserAgent("LepotaFM-App");

        player = new ExoPlayer.Builder(this)
                .setMediaSourceFactory(new DefaultMediaSourceFactory(httpDataSourceFactory))
                .setLoadControl(loadControl)
                .build();

        // --- НАСТРОЙКИ АТРИБУТОВ ЗВУКА ---
        // Используем USAGE_GAME, чтобы система охотнее смешивала звуки, а не глушила их
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(C.USAGE_GAME) 
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build();
        
        // ВТОРОЙ ПАРАМЕТР FALSE ВАЖЕН:
        // Это говорит плееру: "Не ставь паузу сам, если система просит. Я сам решу в focusChangeListener".
        player.setAudioAttributes(audioAttributes, false); 

        player.setWakeMode(C.WAKE_MODE_NETWORK);

        MediaItem mediaItem = MediaItem.fromUri(streamUrl);
        player.setMediaItem(mediaItem);
        player.setVolume(currentVolume);
        player.prepare();
        
        requestAudioFocus(); // Забираем фокус при старте
        player.setPlayWhenReady(true); 

        player.addListener(new Player.Listener() {
            @Override
            public void onPlayerError(PlaybackException error) {
                player.setPlayWhenReady(false);
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

    private void setupWebView() {
        myWebView = findViewById(R.id.myWebView);
        myWebView.setBackgroundColor(Color.BLACK);

        WebSettings webSettings = myWebView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);

        myWebView.addJavascriptInterface(new WebAppInterface(this), "Android");
        
        myWebView.setWebViewClient(new WebViewClient()); // Убрали лишнее
        
        myWebView.loadUrl(siteUrl);
    }

    // Эта функция отправляет статус в JS
    private void syncToWeb() {
        new Handler(Looper.getMainLooper()).post(() -> {
            if (myWebView != null && player != null) {
                boolean isPlaying = player.getPlayWhenReady();
                String jsCommand = "if(window.syncAppState) { window.syncAppState(" + isPlaying + ", " + isPaidUser + "); }";
                myWebView.evaluateJavascript(jsCommand, null);
            }
        });
    }

    // --- СЛЕДИМ, ГДЕ ПОЛЬЗОВАТЕЛЬ ---
    @Override
    protected void onStart() {
        super.onStart();
        isActivityVisible = true; // Мы в приложении
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (myWebView.canGoBack()) myWebView.goBack();
                else moveTaskToBack(true);
            }
        });
    }

    @Override
    protected void onStop() {
        super.onStop();
        isActivityVisible = false; // Свернули или ушли
    }

    public class WebAppInterface {
        Context mContext;
        WebAppInterface(Context c) { mContext = c; }

        @JavascriptInterface
        public void notifyPageLoaded() {
            syncToWeb();
        }

        @JavascriptInterface
        public void playAudio() {
            new Handler(Looper.getMainLooper()).post(() -> {
                if (player != null) {
                    requestAudioFocus(); // Если нажали плей, снова требуем фокус
                    player.setPlayWhenReady(true);
                }
            });
        }

        @JavascriptInterface
        public void pauseAudio() {
            new Handler(Looper.getMainLooper()).post(() -> {
                if (player != null) player.setPlayWhenReady(false);
            });
        }

        @JavascriptInterface
        public void setVolume(float vol) {
            new Handler(Looper.getMainLooper()).post(() -> {
                if (player != null) {
                    currentVolume = vol;
                    player.setVolume(vol);
                }
            });
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        if (player != null) { player.release(); player = null; }
        if (audioManager != null && focusChangeListener != null) {
            audioManager.abandonAudioFocus(focusChangeListener);
        }
    }
}
