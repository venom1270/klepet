function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  var jeSlika = sporocilo.indexOf("alt='Slika'") > -1;
  var jeYoutube = sporocilo.indexOf('<iframe src="https://www.youtube.com/embed/') > -1;
  if (jeSmesko || jeSlika || jeYoutube) {
    //alert(sporocilo);
    sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace(/&lt;img/g, '<img').replace(/png\' \/&gt;/g, 'png\' />'); //smeskoti
    sporocilo =sporocilo.replace(/jpg\' \/&gt;/g, 'jpg\' />').replace(/gif\' \/&gt;/g, 'gif\' />'); //za slike (jpg,gif; png je ze zgoraj)
    sporocilo = sporocilo.replace(/&lt;iframe/g, '<iframe').replace(/&gt;&lt;\/iframe&gt;/g, '></iframe>'); //youtube
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  
  sporocilo = dodajSlike(sporocilo);
  sporocilo = dodajSmeske(sporocilo);
  sporocilo = dodajYoutube(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
  izbraniUporabnik = ""; //da nebo na desni strani vec obarvan (hitra zasebna sporocila)
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";
var izbraniUporabnik = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      if (uporabniki[i] === izbraniUporabnik) {
        $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]).css("background-color", "#ddd"));
      } else {
        $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
      }
      
    }
    
    
    
    $('#seznam-uporabnikov div').click(function() {
      $('#seznam-uporabnikov div').css("background-color", "white");
      izbraniUporabnik = $(this).text();
      $(this).css("background-color", "#ddd");
      $("#poslji-sporocilo").val('/zasebno "' + izbraniUporabnik + '" ');
      $('#poslji-sporocilo').focus();
    });
  });
  
  socket.on('dregljaj', function(x) {
     if (x.dregljaj) {
       //alert("dregljaj");
       $("#vsebina").trigger('startRumble');
       setTimeout(function () {
         $("#vsebina").trigger('stopRumble');
       }, 1500);
     } 
  });
  
  $("#vsebina").jrumble();
  
  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  $('#seznam-uporabnikov').mouseover(function() {
    $(this).css("cursor", "pointer");
  });
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}


function dodajSlike(vhod) {
  vhod = vhod.replace(new RegExp('\\b(http://|https://)[^ ]*(.jpg|.gif|.png)\\b', 'g'), function(x) {
    return x+" <img style='width:200px; margin-left:20px;' alt='Slika' src='"+x+"' />";
  });
  return vhod;
}

function dodajYoutube(vhod) {
  vhod = vhod.replace(new RegExp('\\bhttps://www.youtube.com/watch\\?v=[^ ]*\\b', 'g'), function(x) {
    var codeStart = x.indexOf("?v=") + 3;
    var code = x.substring(codeStart, x.length);
    return '<iframe src="https://www.youtube.com/embed/'+code+'" style="width:200px; height:150px; margin-left:20px;" allowfullscreen></iframe>';
  });
  return vhod;
}
