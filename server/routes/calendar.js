// server/routes/calendar.js
const express = require('express');
const { promisePool } = require('../config/db');
const { cleanRecords, cleanRecord } = require('../utils/dateFormatter');
const router = express.Router();

// Comprehensive Orthodox liturgical data based on GOARCH calendar
const LITURGICAL_DATA = {
  'en': {
    // January
    '01-01': [{
      id: 'basil',
      name: 'St. Basil the Great',
      type: 'bishop',
      description: 'Archbishop of Caesarea, liturgist and theologian',
      rank: 'major',
      readings: {
        epistle: { ref: 'Hebrews 7:26-8:2', text: 'For such a high priest became us...' },
        gospel: { ref: 'John 10:9-16', text: 'I am the door...' }
      }
    }, {
      id: 'circumcision',
      name: 'Circumcision of Our Lord',
      type: 'feast',
      description: 'Feast of the Circumcision of Christ',
      rank: 'major',
      color: 'white',
      readings: {
        epistle: { ref: 'Colossians 2:8-12', text: 'Beware lest anyone cheat you...' },
        gospel: { ref: 'Luke 2:20-21, 40-52', text: 'And the shepherds returned...' }
      }
    }],
    '01-02': [{
      id: 'sylvester',
      name: 'St. Sylvester, Pope of Rome',
      type: 'bishop',
      description: 'Pope during Constantine\'s reign',
      readings: {
        epistle: { ref: 'Hebrews 13:7-16', text: 'Remember those who rule over you...' },
        gospel: { ref: 'John 10:9-16', text: 'I am the door...' }
      }
    }],
    '01-06': [{
      id: 'theophany',
      name: 'Theophany of Our Lord',
      type: 'feast',
      description: 'Baptism of Christ in the Jordan',
      rank: 'great',
      color: 'white',
      readings: {
        epistle: { ref: 'Titus 2:11-14; 3:4-7', text: 'For the grace of God that brings salvation...' },
        gospel: { ref: 'Matthew 3:13-17', text: 'Then Jesus came from Galilee to John...' }
      }
    }],
    '01-07': [{
      id: 'john-baptist-synaxis',
      name: 'Synaxis of St. John the Baptist',
      type: 'prophet',
      description: 'Forerunner of Christ',
      rank: 'major',
      readings: {
        epistle: { ref: 'Acts 19:1-8', text: 'And it happened, while Apollos was at Corinth...' },
        gospel: { ref: 'John 1:29-34', text: 'The next day John saw Jesus coming toward him...' }
      }
    }],
    '01-17': [{
      id: 'anthony',
      name: 'St. Anthony the Great',
      type: 'monk',
      description: 'Father of Monasticism',
      rank: 'major',
      readings: {
        epistle: { ref: 'Ephesians 6:10-17', text: 'Finally, my brethren, be strong in the Lord...' },
        gospel: { ref: 'Matthew 4:25-5:12', text: 'And great multitudes followed Him...' }
      }
    }],
    '01-25': [{
      id: 'gregory-theologian',
      name: 'St. Gregory the Theologian',
      type: 'bishop',
      description: 'Archbishop of Constantinople',
      rank: 'major',
      readings: {
        epistle: { ref: 'Hebrews 7:26-8:2', text: 'For such a high priest became us...' },
        gospel: { ref: 'John 10:9-16', text: 'I am the door...' }
      }
    }],
    '01-30': [{
      id: 'three-hierarchs',
      name: 'Three Holy Hierarchs',
      type: 'bishop',
      description: 'Basil, Gregory, and John Chrysostom',
      rank: 'major',
      color: 'gold',
      readings: {
        epistle: { ref: 'Hebrews 13:7-16', text: 'Remember those who rule over you...' },
        gospel: { ref: 'Matthew 5:14-19', text: 'You are the light of the world...' }
      }
    }],

    // February
    '02-02': [{
      id: 'presentation',
      name: 'Presentation of Our Lord',
      type: 'feast',
      description: 'Meeting of the Lord in the Temple',
      rank: 'great',
      color: 'white',
      readings: {
        epistle: { ref: 'Hebrews 7:7-17', text: 'Now beyond all contradiction...' },
        gospel: { ref: 'Luke 2:22-40', text: 'Now when the days of her purification...' }
      }
    }],
    '02-24': [{
      id: 'first-second-finding',
      name: 'First and Second Finding of the Head of St. John the Baptist',
      type: 'feast',
      description: 'Discovery of the relic',
      readings: {
        epistle: { ref: 'I Corinthians 4:9-16', text: 'For we have been made a spectacle...' },
        gospel: { ref: 'Matthew 11:2-15', text: 'And when John had heard in prison...' }
      }
    }],

    // March
    '03-09': [{
      id: 'forty-martyrs',
      name: 'Forty Martyrs of Sebaste',
      type: 'martyr',
      description: 'Soldiers martyred in frozen lake',
      rank: 'major',
      readings: {
        epistle: { ref: 'Hebrews 12:1-10', text: 'Therefore we also, since we are surrounded...' },
        gospel: { ref: 'Matthew 20:1-16', text: 'For the kingdom of heaven is like...' }
      }
    }],
    '03-25': [{
      id: 'annunciation',
      name: 'Annunciation of the Theotokos',
      type: 'feast',
      description: 'Announcement to the Virgin Mary',
      rank: 'great',
      color: 'blue',
      readings: {
        epistle: { ref: 'Hebrews 2:11-18', text: 'For both He who sanctifies...' },
        gospel: { ref: 'Luke 1:24-38', text: 'Now in the sixth month...' }
      }
    }],

    // April
    '04-23': [{
      id: 'george',
      name: 'St. George the Trophy-bearer',
      type: 'martyr',
      description: 'Great Martyr and Dragon-slayer',
      rank: 'major',
      readings: {
        epistle: { ref: 'II Timothy 2:1-10', text: 'You therefore, my son...' },
        gospel: { ref: 'John 15:17-16:2', text: 'These things I command you...' }
      }
    }],
    '04-25': [{
      id: 'mark-evangelist',
      name: 'St. Mark the Evangelist',
      type: 'apostle',
      description: 'Evangelist and first Bishop of Alexandria',
      readings: {
        epistle: { ref: 'I Peter 5:6-14', text: 'Therefore humble yourselves...' },
        gospel: { ref: 'Mark 6:7-13', text: 'And He called the twelve to Himself...' }
      }
    }],

    // May
    '05-08': [{
      id: 'john-theologian',
      name: 'St. John the Theologian',
      type: 'apostle',
      description: 'Beloved disciple and evangelist',
      rank: 'major',
      readings: {
        epistle: { ref: 'I John 1:1-7', text: 'That which was from the beginning...' },
        gospel: { ref: 'John 19:25-27; 21:24-25', text: 'Now there stood by the cross...' }
      }
    }],
    '05-21': [{
      id: 'constantine-helena',
      name: 'Sts. Constantine and Helena',
      type: 'emperor',
      description: 'Equal-to-the-Apostles',
      rank: 'major',
      readings: {
        epistle: { ref: 'I Corinthians 1:18-24', text: 'For the message of the cross...' },
        gospel: { ref: 'John 19:6-11, 13-20, 25-28, 30-35', text: 'Therefore, when the chief priests...' }
      }
    }],

    // June
    '06-24': [{
      id: 'nativity-john-baptist',
      name: 'Nativity of St. John the Baptist',
      type: 'feast',
      description: 'Birth of the Forerunner',
      rank: 'great',
      color: 'white',
      readings: {
        epistle: { ref: 'Romans 13:11-14:4', text: 'And do this, knowing the time...' },
        gospel: { ref: 'Luke 1:1-25, 57-68, 76, 80', text: 'Inasmuch as many have taken in hand...' }
      }
    }],
    '06-29': [{
      id: 'peter-paul',
      name: 'Sts. Peter and Paul',
      type: 'apostle',
      description: 'Chief Apostles',
      rank: 'great',
      color: 'gold',
      readings: {
        epistle: { ref: 'II Corinthians 11:21-12:9', text: 'Are they Hebrews? So am I...' },
        gospel: { ref: 'Matthew 16:13-19', text: 'When Jesus came into the region...' }
      }
    }],

    // July
    '07-01': [{
      id: 'cosmas-damian',
      name: 'Cosmas & Damian the Holy Unmercenaries',
      type: 'martyr',
      description: 'Unmercenary healers',
      rank: 'major',
      readings: {
        epistle: { ref: 'I Corinthians 12:27-31; 13:1-8', text: 'Now you are the body of Christ...' },
        gospel: { ref: 'Matthew 10:1, 5-8', text: 'And when He had called His twelve disciples...' }
      }
    }],
    '07-02': [{
      id: 'robe-theotokos',
      name: 'Deposition of the Precious Robe of the Theotokos in Blachernae',
      type: 'feast',
      description: 'Deposition of the relic',
      readings: {
        epistle: { ref: 'Hebrews 9:1-7', text: 'Then indeed, even the first covenant...' },
        gospel: { ref: 'Luke 1:39-49, 56', text: 'Now Mary arose in those days...' }
      }
    }],
    '07-05': [{
      id: 'athanasius-athos',
      name: 'Athanasius of Mount Athos',
      type: 'monk',
      description: 'Founder of Great Lavra',
      readings: {
        epistle: { ref: 'Galatians 5:22-26; 6:1-2', text: 'But the fruit of the Spirit...' },
        gospel: { ref: 'Matthew 11:27-30', text: 'All things have been delivered...' }
      }
    }],
    '07-07': [{
      id: 'kyriake',
      name: 'Kyriake the Great Martyr',
      type: 'martyr',
      description: 'Virgin martyr',
      readings: {
        epistle: { ref: 'Galatians 3:23-29; 4:1-5', text: 'But before faith came...' },
        gospel: { ref: 'Mark 5:24-34', text: 'So Jesus went with him...' }
      }
    }],
    '07-08': [{
      id: 'procopius',
      name: 'The Holy Great Martyr Procopius',
      type: 'martyr',
      description: 'Great Martyr',
      readings: {
        epistle: { ref: 'I Timothy 4:9-15', text: 'This is a faithful saying...' },
        gospel: { ref: 'Luke 6:17-19; 9:1-2; 10:16-21', text: 'And He came down with them...' }
      }
    }],
    '07-11': [{
      id: 'euphemia',
      name: 'Euphemia the Great Martyr',
      type: 'martyr',
      description: 'Witness to Orthodox faith',
      readings: {
        epistle: { ref: 'II Corinthians 6:1-10', text: 'We then, as workers together...' },
        gospel: { ref: 'Luke 7:36-50', text: 'Then one of the Pharisees...' }
      }
    }],
    '07-15': [{
      id: 'cyricus-julitta',
      name: 'The Holy Martyrs Cyricus and His Mother Julitta',
      type: 'martyr',
      description: 'Child martyr and his mother',
      readings: {
        epistle: { ref: 'I Corinthians 13:11-14; 14:1-5', text: 'When I was a child...' },
        gospel: { ref: 'Matthew 17:24-27; 18:1-4', text: 'When they had come to Capernaum...' }
      }
    }],
    '07-17': [{
      id: 'marina',
      name: 'The Holy Great Martyr Marina (Margaret)',
      type: 'martyr',
      description: 'Virgin martyr',
      readings: {
        epistle: { ref: 'Galatians 3:23-29; 4:1-5', text: 'But before faith came...' },
        gospel: { ref: 'Mark 5:24-34', text: 'So Jesus went with him...' }
      }
    }],
    '07-22': [{
      id: 'mary-magdalene',
      name: 'Mary Magdalene, the Holy Myrrh-bearer and Equal to the Apostles',
      type: 'apostle',
      description: 'Myrrh-bearer and Equal to the Apostles',
      rank: 'major',
      readings: {
        epistle: { ref: 'I Corinthians 9:2-12', text: 'If I am not an apostle to others...' },
        gospel: { ref: 'Luke 8:1-3', text: 'Now it came to pass, afterward...' }
      }
    }],
    '07-25': [{
      id: 'anna-dormition',
      name: 'Dormition of St. Anna, mother of the Theotokos',
      type: 'feast',
      description: 'Dormition of the Theotokos\' mother',
      rank: 'major',
      readings: {
        epistle: { ref: 'Galatians 4:22-27', text: 'For it is written that Abraham...' },
        gospel: { ref: 'Luke 8:16-21', text: 'No one, when he has lit a lamp...' }
      }
    }],
    '07-26': [{
      id: 'paraskeve',
      name: 'Paraskeve the Righteous Martyr of Rome',
      type: 'martyr',
      description: 'Righteous Martyr',
      readings: {
        epistle: { ref: 'Galatians 3:23-29; 4:1-5', text: 'But before faith came...' },
        gospel: { ref: 'Mark 5:24-34', text: 'So Jesus went with him...' }
      }
    }],

    // August
    '08-01': [{
      id: 'procession-cross',
      name: 'Procession of the Precious Cross',
      type: 'feast',
      description: 'Beginning of Dormition Fast',
      color: 'purple',
      readings: {
        epistle: { ref: 'I Corinthians 1:18-24', text: 'For the message of the cross...' },
        gospel: { ref: 'John 19:6-11, 13-20, 25-28, 30-35', text: 'Therefore, when the chief priests...' }
      }
    }],
    '08-06': [{
      id: 'transfiguration',
      name: 'Transfiguration of Our Lord',
      type: 'feast',
      description: 'Christ transfigured on Mount Tabor',
      rank: 'great',
      color: 'white',
      readings: {
        epistle: { ref: 'II Peter 1:10-19', text: 'Therefore, brethren, be even more diligent...' },
        gospel: { ref: 'Matthew 17:1-9', text: 'Now after six days Jesus took Peter...' }
      }
    }],
    '08-15': [{
      id: 'dormition',
      name: 'Dormition of the Theotokos',
      type: 'feast',
      description: 'Falling asleep of the Virgin Mary',
      rank: 'great',
      color: 'blue',
      readings: {
        epistle: { ref: 'Philippians 2:5-11', text: 'Let this mind be in you...' },
        gospel: { ref: 'Luke 10:38-42; 11:27-28', text: 'Now it happened as they went...' }
      }
    }],
    '08-29': [{
      id: 'beheading-john-baptist',
      name: 'Beheading of St. John the Baptist',
      type: 'feast',
      description: 'Martyrdom of the Forerunner',
      rank: 'major',
      color: 'red',
      readings: {
        epistle: { ref: 'Acts 13:25-32', text: 'And as John was finishing his course...' },
        gospel: { ref: 'Mark 6:14-30', text: 'Now King Herod heard of Him...' }
      }
    }],

    // September
    '09-01': [{
      id: 'church-year',
      name: 'Beginning of the Church Year',
      type: 'feast',
      description: 'Start of liturgical year',
      readings: {
        epistle: { ref: 'I Timothy 2:1-7', text: 'Therefore I exhort first of all...' },
        gospel: { ref: 'Luke 4:16-22', text: 'So He came to Nazareth...' }
      }
    }],
    '09-08': [{
      id: 'nativity-theotokos',
      name: 'Nativity of the Theotokos',
      type: 'feast',
      description: 'Birth of the Virgin Mary',
      rank: 'great',
      color: 'blue',
      readings: {
        epistle: { ref: 'Philippians 2:5-11', text: 'Let this mind be in you...' },
        gospel: { ref: 'Luke 10:38-42; 11:27-28', text: 'Now it happened as they went...' }
      }
    }],
    '09-14': [{
      id: 'exaltation-cross',
      name: 'Exaltation of the Precious Cross',
      type: 'feast',
      description: 'Universal Exaltation',
      rank: 'great',
      color: 'purple',
      readings: {
        epistle: { ref: 'I Corinthians 1:18-24', text: 'For the message of the cross...' },
        gospel: { ref: 'John 19:6-11, 13-20, 25-28, 30-35', text: 'Therefore, when the chief priests...' }
      }
    }],

    // October
    '10-01': [{
      id: 'protection-theotokos',
      name: 'Protection of the Theotokos',
      type: 'feast',
      description: 'Pokrov of the Virgin Mary',
      rank: 'major',
      color: 'blue',
      readings: {
        epistle: { ref: 'Hebrews 9:1-7', text: 'Then indeed, even the first covenant...' },
        gospel: { ref: 'Luke 1:39-49, 56', text: 'Now Mary arose in those days...' }
      }
    }],
    '10-18': [{
      id: 'luke-evangelist',
      name: 'St. Luke the Evangelist',
      type: 'apostle',
      description: 'Physician and evangelist',
      readings: {
        epistle: { ref: 'Colossians 4:5-9, 14, 18', text: 'Walk in wisdom toward those...' },
        gospel: { ref: 'Luke 10:16-21', text: 'He who hears you hears Me...' }
      }
    }],
    '10-26': [{
      id: 'demetrius',
      name: 'St. Demetrius of Thessalonica',
      type: 'martyr',
      description: 'Great Martyr and Myrrh-bearer',
      rank: 'major',
      readings: {
        epistle: { ref: 'II Timothy 2:1-10', text: 'You therefore, my son...' },
        gospel: { ref: 'John 15:17-16:2', text: 'These things I command you...' }
      }
    }],

    // November
    '11-08': [{
      id: 'michael-gabriel',
      name: 'Synaxis of the Archangel Michael',
      type: 'archangel',
      description: 'Chief of the Heavenly Host',
      rank: 'major',
      color: 'white',
      readings: {
        epistle: { ref: 'Hebrews 2:2-10', text: 'For if the word spoken through angels...' },
        gospel: { ref: 'Luke 10:16-21', text: 'He who hears you hears Me...' }
      }
    }],
    '11-13': [{
      id: 'john-chrysostom',
      name: 'St. John Chrysostom',
      type: 'bishop',
      description: 'Archbishop of Constantinople',
      rank: 'major',
      readings: {
        epistle: { ref: 'Hebrews 7:26-8:2', text: 'For such a high priest became us...' },
        gospel: { ref: 'John 10:9-16', text: 'I am the door...' }
      }
    }],
    '11-21': [{
      id: 'presentation-theotokos',
      name: 'Presentation of the Theotokos',
      type: 'feast',
      description: 'Entrance into the Temple',
      rank: 'great',
      color: 'blue',
      readings: {
        epistle: { ref: 'Hebrews 9:1-7', text: 'Then indeed, even the first covenant...' },
        gospel: { ref: 'Luke 1:39-49, 56', text: 'Now Mary arose in those days...' }
      }
    }],
    '11-30': [{
      id: 'andrew-apostle',
      name: 'St. Andrew the First-Called',
      type: 'apostle',
      description: 'First disciple of Christ',
      rank: 'major',
      readings: {
        epistle: { ref: 'I Corinthians 4:9-16', text: 'For we have been made a spectacle...' },
        gospel: { ref: 'John 1:35-42', text: 'Again, the next day, John stood...' }
      }
    }],

    // December
    '12-04': [{
      id: 'barbara',
      name: 'St. Barbara the Great Martyr',
      type: 'martyr',
      description: 'Virgin martyr',
      rank: 'major',
      readings: {
        epistle: { ref: 'Galatians 3:23-29; 4:1-5', text: 'But before faith came...' },
        gospel: { ref: 'Mark 5:24-34', text: 'So Jesus went with him...' }
      }
    }],
    '12-06': [{
      id: 'nicholas',
      name: 'St. Nicholas the Wonderworker',
      type: 'bishop',
      description: 'Archbishop of Myra',
      rank: 'great',
      readings: {
        epistle: { ref: 'Hebrews 13:17-21', text: 'Obey those who rule over you...' },
        gospel: { ref: 'Luke 6:17-23', text: 'And He came down with them...' }
      }
    }],
    '12-13': [{
      id: 'lucia',
      name: 'St. Lucia of Syracuse',
      type: 'martyr',
      description: 'Virgin martyr',
      readings: {
        epistle: { ref: 'Galatians 3:23-29; 4:1-5', text: 'But before faith came...' },
        gospel: { ref: 'Mark 5:24-34', text: 'So Jesus went with him...' }
      }
    }],
    '12-25': [{
      id: 'nativity',
      name: 'Nativity of Our Lord',
      type: 'feast',
      description: 'Birth of Jesus Christ',
      rank: 'great',
      color: 'gold',
      readings: {
        epistle: { ref: 'Galatians 4:4-7', text: 'But when the fullness of the time...' },
        gospel: { ref: 'Matthew 1:18-25', text: 'Now the birth of Jesus Christ...' }
      }
    }],
    '12-26': [{
      id: 'synaxis-theotokos',
      name: 'Synaxis of the Theotokos',
      type: 'feast',
      description: 'Assembly honoring the Mother of God',
      color: 'blue',
      readings: {
        epistle: { ref: 'Hebrews 2:11-18', text: 'For both He who sanctifies...' },
        gospel: { ref: 'Matthew 2:13-23', text: 'Now when they had departed...' }
      }
    }],
    '12-27': [{
      id: 'stephen',
      name: 'St. Stephen the Protomartyr',
      type: 'martyr',
      description: 'First Christian martyr',
      rank: 'major',
      readings: {
        epistle: { ref: 'Acts 6:8-15; 7:1-5, 47-60', text: 'And Stephen, full of faith...' },
        gospel: { ref: 'Matthew 21:33-42', text: 'Hear another parable...' }
      }
    }],
    '12-29': [{
      id: 'holy-innocents',
      name: 'Holy Innocents of Bethlehem',
      type: 'martyr',
      description: 'Children martyred by Herod',
      readings: {
        epistle: { ref: 'I John 3:13-19', text: 'Do not marvel, my brethren...' },
        gospel: { ref: 'Matthew 2:13-23', text: 'Now when they had departed...' }
      }
    }]
  },
  'gr': {
    '01-01': [{
      id: 'basil',
      name: 'Άγιος Βασίλειος ο Μέγας',
      type: 'bishop',
      description: 'Αρχιεπίσκοπος Καισαρείας, λειτουργός και θεολόγος',
      rank: 'major',
      readings: {
        epistle: { ref: 'Εβραίους 7:26-8:2', text: 'Τοιούτος γάρ ημίν και έπρεπεν αρχιερεύς...' },
        gospel: { ref: 'Ιωάννης 10:9-16', text: 'Εγώ ειμί η θύρα...' }
      }
    }, {
      id: 'circumcision',
      name: 'Περιτομή του Κυρίου',
      type: 'feast',
      description: 'Εορτή της Περιτομής του Χριστού',
      rank: 'major',
      color: 'white',
      readings: {
        epistle: { ref: 'Κολασσαείς 2:8-12', text: 'Βλέπετε μη τις υμάς έσται...' },
        gospel: { ref: 'Λουκάς 2:20-21, 40-52', text: 'Και υπέστρεψαν οι ποιμένες...' }
      }
    }],
    '01-06': [{
      id: 'theophany',
      name: 'Θεοφάνεια του Κυρίου',
      type: 'feast',
      description: 'Βάπτισμα του Χριστού στον Ιορδάνη',
      rank: 'great',
      color: 'white',
      readings: {
        epistle: { ref: 'Τίτος 2:11-14; 3:4-7', text: 'Επεφάνη γάρ η χάρις του Θεού...' },
        gospel: { ref: 'Ματθαίος 3:13-17', text: 'Τότε παραγίνεται ο Ιησούς...' }
      }
    }],
    '12-25': [{
      id: 'nativity',
      name: 'Γέννηση του Κυρίου',
      type: 'feast',
      description: 'Γέννηση του Ιησού Χριστού',
      rank: 'great',
      color: 'gold',
      readings: {
        epistle: { ref: 'Γαλάτας 4:4-7', text: 'Ότε δε ήλθε το πλήρωμα του χρόνου...' },
        gospel: { ref: 'Ματθαίος 1:18-25', text: 'Του δε Ιησού Χριστού η γέννησις...' }
      }
    }]
  },
  'ru': {
    '01-01': [{
      id: 'basil',
      name: 'Святитель Василий Великий',
      type: 'bishop',
      description: 'Архиепископ Кесарийский, литургист и богослов',
      rank: 'major',
      readings: {
        epistle: { ref: 'Евреям 7:26-8:2', text: 'Таков и должен быть у нас Первосвященник...' },
        gospel: { ref: 'Иоанн 10:9-16', text: 'Я есмь дверь...' }
      }
    }, {
      id: 'circumcision',
      name: 'Обрезание Господне',
      type: 'feast',
      description: 'Праздник Обрезания Христова',
      rank: 'major',
      color: 'white',
      readings: {
        epistle: { ref: 'Колоссянам 2:8-12', text: 'Смотрите, братия, чтобы кто не увлек вас...' },
        gospel: { ref: 'Лука 2:20-21, 40-52', text: 'И возвратились пастухи...' }
      }
    }],
    '01-06': [{
      id: 'theophany',
      name: 'Богоявление Господне',
      type: 'feast',
      description: 'Крещение Христово в Иордане',
      rank: 'great',
      color: 'white',
      readings: {
        epistle: { ref: 'Титу 2:11-14; 3:4-7', text: 'Ибо явилась благодать Божия...' },
        gospel: { ref: 'Матфей 3:13-17', text: 'Тогда приходит Иисус из Галилеи...' }
      }
    }],
    '12-25': [{
      id: 'nativity',
      name: 'Рождество Христово',
      type: 'feast',
      description: 'Рождение Иисуса Христа',
      rank: 'great',
      color: 'gold',
      readings: {
        epistle: { ref: 'Галатам 4:4-7', text: 'Но когда пришла полнота времени...' },
        gospel: { ref: 'Матфей 1:18-25', text: 'Рождество Иисуса Христа было так...' }
      }
    }]
  },
  'ro': {
    '01-01': [{
      id: 'basil',
      name: 'Sfântul Vasile cel Mare',
      type: 'bishop',
      description: 'Arhiepiscopul Cezareei, liturgist și teolog',
      rank: 'major',
      readings: {
        epistle: { ref: 'Evrei 7:26-8:2', text: 'Căci un astfel de arhiereu ne trebuia...' },
        gospel: { ref: 'Ioan 10:9-16', text: 'Eu sunt ușa...' }
      }
    }, {
      id: 'circumcision',
      name: 'Tăierea împrejur a Domnului',
      type: 'feast',
      description: 'Sărbătoarea Tăierii împrejur a lui Hristos',
      rank: 'major',
      color: 'white',
      readings: {
        epistle: { ref: 'Coloseni 2:8-12', text: 'Băgați de seamă să nu vă înșele cineva...' },
        gospel: { ref: 'Luca 2:20-21, 40-52', text: 'Și păstorii s-au întors...' }
      }
    }],
    '01-06': [{
      id: 'theophany',
      name: 'Boboteaza Domnului',
      type: 'feast',
      description: 'Botezul lui Hristos în Iordan',
      rank: 'great',
      color: 'white',
      readings: {
        epistle: { ref: 'Tit 2:11-14; 3:4-7', text: 'Căci s-a arătat harul lui Dumnezeu...' },
        gospel: { ref: 'Matei 3:13-17', text: 'Atunci vine Iisus din Galilea...' }
      }
    }],
    '12-25': [{
      id: 'nativity',
      name: 'Nașterea Domnului',
      type: 'feast',
      description: 'Nașterea lui Iisus Hristos',
      rank: 'great',
      color: 'gold',
      readings: {
        epistle: { ref: 'Galateni 4:4-7', text: 'Dar când a venit plinirea vremii...' },
        gospel: { ref: 'Matei 1:18-25', text: 'Iar nașterea lui Iisus Hristos a fost astfel...' }
      }
    }]
  }
};

// Fasting information by date and type
const FASTING_RULES = {
  // Great Lent periods (calculated dynamically)
  'great-lent': {
    name: { en: 'Great Lent', gr: 'Μεγάλη Τεσσαρακοστή', ru: 'Великий пост', ro: 'Postul Mare' },
    type: 'strict',
    description: {
      en: 'Strict fast: no meat, dairy, eggs, fish, wine, or oil',
      gr: 'Αυστηρή νηστεία: όχι κρέας, γαλακτοκομικά, αυγά, ψάρι, κρασί ή λάδι',
      ru: 'Строгий пост: никакого мяса, молочных продуктов, яиц, рыбы, вина или масла',
      ro: 'Post strict: fără carne, lactate, ouă, pește, vin sau ulei'
    },
    color: 'red'
  },
  'dormition-fast': {
    name: { en: 'Dormition Fast', gr: 'Νηστεία της Κοιμήσεως', ru: 'Успенский пост', ro: 'Postul Adormirii' },
    type: 'strict',
    description: {
      en: 'Strict fast: no meat, dairy, eggs, fish, wine, or oil',
      gr: 'Αυστηρή νηστεία: όχι κρέας, γαλακτοκομικά, αυγά, ψάρι, κρασί ή λάδι',
      ru: 'Строгий пост: никакого мяса, молочных продуктов, яиц, рыбы, вина или масла',
      ro: 'Post strict: fără carne, lactate, ouă, pește, vin sau ulei'
    },
    color: 'red',
    dates: ['08-01', '08-15'] // August 1-15
  },
  'nativity-fast': {
    name: { en: 'Nativity Fast', gr: 'Νηστεία των Χριστουγέννων', ru: 'Рождественский пост', ro: 'Postul Crăciunului' },
    type: 'moderate',
    description: {
      en: 'Moderate fast: no meat, dairy, eggs; fish, wine, and oil allowed on certain days',
      gr: 'Μέτρια νηστεία: όχι κρέας, γαλακτοκομικά, αυγά· ψάρι, κρασί και λάδι επιτρέπονται σε ορισμένες μέρες',
      ru: 'Умеренный пост: никакого мяса, молочных продуктов, яиц; рыба, вино и масло разрешены в определенные дни',
      ro: 'Post moderat: fără carne, lactate, ouă; pește, vin și ulei permise în anumite zile'
    },
    color: 'purple',
    dates: ['11-15', '12-25'] // November 15 - December 25
  },
  'wednesday-friday': {
    name: { en: 'Wednesday & Friday Fast', gr: 'Νηστεία Τετάρτης & Παρασκευής', ru: 'Среда и пятница', ro: 'Miercuri și vineri' },
    type: 'moderate',
    description: {
      en: 'No meat, dairy, eggs, fish; wine and oil allowed',
      gr: 'Όχι κρέας, γαλακτοκομικά, αυγά, ψάρι· κρασί και λάδι επιτρέπονται',
      ru: 'Никакого мяса, молочных продуктов, яиц, рыбы; вино и масло разрешены',
      ro: 'Fără carne, lactate, ouă, pește; vin și ulei permise'
    },
    color: 'purple'
  }
};

// Calculate Orthodox Pascha for a given year
function calculatePascha(year) {
  const a = year % 19;
  const b = year % 4;
  const c = year % 7;
  const d = (19 * a + 15) % 30;
  const e = (2 * b + 4 * c + 6 * d + 6) % 7;

  let julianDay = 22 + d + e;
  let month = 3;

  if (julianDay > 31) {
    month = 4;
    julianDay -= 31;
  }

  const julianDate = new Date(year, month - 1, julianDay);
  const gregorianOffset = getGregorianOffset(year);
  const gregorianDate = new Date(julianDate);
  gregorianDate.setDate(gregorianDate.getDate() + gregorianOffset);

  return gregorianDate;
}

function getGregorianOffset(year) {
  const centuries = Math.floor(year / 100);
  const leapCenturies = Math.floor(year / 400);
  return centuries - leapCenturies - 2;
}

// Calculate all movable feasts for a year
function calculateMovableFeasts(year) {
  const pascha = calculatePascha(year);

  const movableFeasts = {};

  // Add Pascha
  const paschaKey = `${String(pascha.getMonth() + 1).padStart(2, '0')}-${String(pascha.getDate()).padStart(2, '0')}`;
  movableFeasts[paschaKey] = [{
    id: 'pascha',
    name: 'Pascha (Easter)',
    type: 'feast',
    description: 'Resurrection of Our Lord'
  }];

  // Palm Sunday (week before Pascha)
  const palmSunday = new Date(pascha);
  palmSunday.setDate(pascha.getDate() - 7);
  const palmKey = `${String(palmSunday.getMonth() + 1).padStart(2, '0')}-${String(palmSunday.getDate()).padStart(2, '0')}`;
  movableFeasts[palmKey] = [{
    id: 'palm-sunday',
    name: 'Palm Sunday',
    type: 'feast',
    description: 'Entry of Our Lord into Jerusalem'
  }];

  // Pentecost (50 days after Pascha)
  const pentecost = new Date(pascha);
  pentecost.setDate(pascha.getDate() + 49);
  const pentecostKey = `${String(pentecost.getMonth() + 1).padStart(2, '0')}-${String(pentecost.getDate()).padStart(2, '0')}`;
  movableFeasts[pentecostKey] = [{
    id: 'pentecost',
    name: 'Pentecost',
    type: 'feast',
    description: 'Descent of the Holy Spirit'
  }];

  // All Saints Sunday (week after Pentecost)
  const allSaints = new Date(pascha);
  allSaints.setDate(pascha.getDate() + 56);
  const allSaintsKey = `${String(allSaints.getMonth() + 1).padStart(2, '0')}-${String(allSaints.getDate()).padStart(2, '0')}`;
  movableFeasts[allSaintsKey] = [{
    id: 'all-saints',
    name: 'All Saints',
    type: 'feast',
    description: 'Commemoration of All Saints'
  }];

  return movableFeasts;
}

// Get fasting information for a specific date
function getFastingInfo(date, paschalData, lang = 'en') {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay();
  const dateKey = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const fasting = [];

  // Check for Great Lent (calculated dynamically)
  const daysSincePascha = Math.floor((date.getTime() - paschalData.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSincePascha >= -48 && daysSincePascha < 0) {
    const fastInfo = FASTING_RULES['great-lent'];
    fasting.push({
      name: fastInfo.name[lang],
      type: fastInfo.type,
      description: fastInfo.description[lang],
      color: fastInfo.color,
      level: 'strict'
    });
  }

  // Check for Dormition Fast (August 1-15)
  if (month === 8 && day >= 1 && day <= 15) {
    const fastInfo = FASTING_RULES['dormition-fast'];
    fasting.push({
      name: fastInfo.name[lang],
      type: fastInfo.type,
      description: fastInfo.description[lang],
      color: fastInfo.color,
      level: 'strict'
    });
  }

  // Check for Nativity Fast (November 15 - December 25)
  if ((month === 11 && day >= 15) || (month === 12 && day <= 25)) {
    const fastInfo = FASTING_RULES['nativity-fast'];
    fasting.push({
      name: fastInfo.name[lang],
      type: fastInfo.type,
      description: fastInfo.description[lang],
      color: fastInfo.color,
      level: 'moderate'
    });
  }

  // Check for Wednesday and Friday fasts (except during fast-free periods)
  if (dayOfWeek === 3 || dayOfWeek === 5) {
    // Not during Bright Week or other fast-free periods
    if (!(daysSincePascha >= 0 && daysSincePascha <= 6)) {
      const fastInfo = FASTING_RULES['wednesday-friday'];
      fasting.push({
        name: fastInfo.name[lang],
        type: fastInfo.type,
        description: fastInfo.description[lang],
        color: fastInfo.color,
        level: 'moderate'
      });
    }
  }

  return fasting;
}

// Enhanced liturgical color calculation
function getLiturgicalColor(date, paschalData, dayData) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  // Check for feast colors first
  const feasts = dayData.feasts || [];
  const majorFeast = feasts.find(f => f.rank === 'great' || f.rank === 'major');
  if (majorFeast && majorFeast.color) {
    return majorFeast.color;
  }

  // Paschal season colors
  if (paschalData) {
    const daysSincePascha = Math.floor((date.getTime() - paschalData.getTime()) / (1000 * 60 * 60 * 24));

    // Bright Week - White/Gold
    if (daysSincePascha >= 0 && daysSincePascha <= 6) {
      return 'gold';
    }

    // Great Lent - Purple
    if (daysSincePascha >= -48 && daysSincePascha < 0) {
      return 'purple';
    }

    // Pentecostarion - White
    if (daysSincePascha >= 0 && daysSincePascha <= 56) {
      return 'white';
    }
  }

  // Check for fasting periods
  const fastingInfo = getFastingInfo(date, paschalData, 'en');
  if (fastingInfo.length > 0) {
    return fastingInfo[0].color || 'purple';
  }

  // Sundays - Gold
  if (dayOfWeek === 0) {
    return 'gold';
  }

  // Default to green
  return 'green';
}

// GET /api/calendar/:lang/:year - Get calendar data for a specific year and language
router.get('/:lang/:year', async (req, res) => {
  try {
    const { lang, year } = req.params;
    const yearNum = parseInt(year);

    if (!['en', 'gr', 'ru', 'ro'].includes(lang)) {
      return res.status(400).json({ error: 'Invalid language' });
    }

    if (yearNum < 1900 || yearNum > 2100) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    // Calculate movable feasts for the year
    const movableFeasts = calculateMovableFeasts(yearNum);
    const pascha = calculatePascha(yearNum);

    // Get fixed feasts for the language
    const fixedFeasts = LITURGICAL_DATA[lang] || LITURGICAL_DATA['en'];

    // Combine fixed and movable feasts
    const allFeasts = { ...fixedFeasts, ...movableFeasts };

    // Generate calendar data for the entire year
    const calendarData = [];
    const startDate = new Date(yearNum, 0, 1);
    const endDate = new Date(yearNum, 11, 31);

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = `${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      const dayFeasts = allFeasts[dateKey] || [];

      const dayData = {
        date: currentDate.toISOString().split('T')[0],
        feasts: dayFeasts.filter(f => f.type === 'feast'),
        saints: dayFeasts.filter(f => f.type !== 'feast'),
        readings: dayFeasts.length > 0 ? dayFeasts[0].readings : null,
        fasting: getFastingInfo(currentDate, pascha, lang),
        tone: getTone(currentDate, pascha),
        season: getSeason(currentDate, pascha),
        liturgicalColor: 'green', // Will be calculated below
        localCommemorations: []
      };

      // Calculate liturgical color based on all data
      dayData.liturgicalColor = getLiturgicalColor(currentDate, pascha, dayData);

      calendarData.push(dayData);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json(calendarData);
  } catch (error) {
    console.error('Calendar API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/saints/:id - Get detailed information about a saint
router.get('/saints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { lang = 'en' } = req.query;

    // Search through all liturgical data for the saint
    const liturgicalData = LITURGICAL_DATA[lang] || LITURGICAL_DATA['en'];

    let saintData = null;
    let feastDay = null;

    // Find the saint in the liturgical data
    for (const [date, dayData] of Object.entries(liturgicalData)) {
      const saint = dayData.find(item => item.id === id);
      if (saint) {
        saintData = saint;
        feastDay = date;
        break;
      }
    }

    if (!saintData) {
      return res.status(404).json({ error: 'Saint not found' });
    }

    // Enhanced saint information
    const enhancedSaintData = {
      id: saintData.id,
      name: saintData.name,
      type: saintData.type,
      description: saintData.description,
      rank: saintData.rank || 'minor',
      feastDay: feastDay,
      liturgicalColor: saintData.color || 'green',
      readings: saintData.readings || null,
      iconPath: `/public/icons/saints/${saintData.id}.jpg`,
      biography: getBiography(saintData.id, lang),
      patronOf: getPatronage(saintData.id, lang),
      associatedRecords: [],
      // Additional liturgical information
      troparia: getTroparia(saintData.id, lang),
      kontakia: getKontakia(saintData.id, lang),
      hymns: getHymns(saintData.id, lang)
    };

    res.json(enhancedSaintData);
  } catch (error) {
    console.error('Saint API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions for saint information
function getBiography(saintId, lang) {
  const biographies = {
    'basil': {
      'en': 'St. Basil the Great (330-379) was a 4th-century bishop of Caesarea Mazaca in Cappadocia, Asia Minor. He was an influential theologian who supported the Nicene Creed and opposed Arianism. Known for his care for the poor and underprivileged, he established charitable institutions and is considered one of the Cappadocian Fathers.',
      'gr': 'Ο Άγιος Βασίλειος ο Μέγας (330-379) ήταν επίσκοπος της Καισαρείας της Καππαδοκίας τον 4ο αιώνα. Ήταν σημαντικός θεολόγος που υποστήριξε τη Νικαιανή Σύνοδο και αντιτάχθηκε στον Αριανισμό.',
      'ru': 'Святитель Василий Великий (330-379) был епископом Кесарии Каппадокийской в 4 веке. Он был влиятельным богословом, поддерживавшим Никейский символ веры и противостоявшим арианству.',
      'ro': 'Sfântul Vasile cel Mare (330-379) a fost episcop al Cezareei din Capadocia în secolul al IV-lea. A fost un teolog influent care a susținut Crezul de la Niceea și s-a opus arianismului.'
    },
    'anthony': {
      'en': 'St. Anthony the Great (251-356) was a Christian monk from Egypt, revered in Christianity as the Father of All Monks. His biography was written by St. Athanasius of Alexandria. He is distinguished from other saints named Anthony by various epithets.',
      'gr': 'Ο Άγιος Αντώνιος ο Μέγας (251-356) ήταν Χριστιανός μοναχός από την Αίγυπτο, που τιμάται στον Χριστιανισμό ως ο Πατέρας όλων των μοναχών.',
      'ru': 'Преподобный Антоний Великий (251-356) был христианским монахом из Египта, почитаемым в христианстве как Отец всех монахов.',
      'ro': 'Sfântul Antonie cel Mare (251-356) a fost un călugăr creștin din Egipt, venerat în creștinism ca Tatăl tuturor călugărilor.'
    }
  };

  return biographies[saintId]?.[lang] || biographies[saintId]?.['en'] || '';
}

function getPatronage(saintId, lang) {
  const patronages = {
    'basil': {
      'en': ['Liturgy', 'Monasticism', 'Education', 'Hospital administrators'],
      'gr': ['Λειτουργία', 'Μοναχισμός', 'Εκπαίδευση', 'Διαχειριστές νοσοκομείων'],
      'ru': ['Литургия', 'Монашество', 'Образование', 'Администраторы больниц'],
      'ro': ['Liturgie', 'Monahism', 'Educație', 'Administratori de spitale']
    },
    'anthony': {
      'en': ['Monasticism', 'Desert Fathers', 'Hermits', 'Skin diseases'],
      'gr': ['Μοναχισμός', 'Πατέρες της Ερήμου', 'Ερημίτες', 'Δερματικές παθήσεις'],
      'ru': ['Монашество', 'Пустынные отцы', 'Отшельники', 'Кожные заболевания'],
      'ro': ['Monahism', 'Părinții pustiei', 'Ermiti', 'Boli de piele']
    }
  };

  return patronages[saintId]?.[lang] || patronages[saintId]?.['en'] || [];
}

function getTroparia(saintId, lang) {
  const troparia = {
    'basil': {
      'en': 'Your voice has gone out into all the earth, which was divinely taught by your doctrine. By it you clarified the nature of creatures, you made human characters orderly. O venerable father, royal priesthood, pray to Christ God to save our souls.',
      'gr': 'Εἰς πᾶσαν τὴν γῆν ἐξῆλθεν ὁ φθόγγος σου, ὡς δεξαμένην τὸν λόγον σου δι᾽ οὗ θεοπρεπῶς ἐδογμάτισας, τὴν φύσιν τῶν ὄντων διεσάφησας, τὰ τῶν ἀνθρώπων ἤθη ἐκόσμησας. Ἱερεῦ ὅσιε, Πάτερ βασιλικόν, πρέσβευε Χριστῷ τῷ Θεῷ σωθῆναι τὰς ψυχὰς ἡμῶν.',
      'ru': 'Во всю землю изыде вещание твое, яко приемшую слово твое, им же боголепно научил еси, естество сущих уяснил еси, человеческия обычаи украсил еси. Священноначальниче преподобне, отче царский, моли Христа Бога спастися душам нашим.',
      'ro': 'În toată pământul a ieșit glasul tău, căci a primit cuvântul tău, prin care ai învățat în mod dumnezeiesc, natura ființelor ai lămurit-o, obiceiurile oamenilor le-ai împodobit. Sfinte arhierei, părinte împărătesc, roagă-te lui Hristos Dumnezeu să se mântuiască sufletele noastre.'
    }
  };

  return troparia[saintId]?.[lang] || troparia[saintId]?.['en'] || null;
}

function getKontakia(saintId, lang) {
  const kontakia = {
    'basil': {
      'en': 'You have shown yourself to be a firm foundation of the Church, granting all mankind a lordship that cannot be taken away, sealing it with your teachings, O venerable Basil, revealer of heavenly things.',
      'gr': 'Στερέωμα τῆς Ἐκκλησίας ἀνεδείχθης, διδοὺς πάσῃ ἀνθρωπότητι κυριότητα ἀναφαίρετον, σφραγίζων τοῖς δόγμασι σου, οὐρανοφάντορ ὅσιε Βασίλειε.',
      'ru': 'Утверждение Церкви явился еси, подая всем человеком господство неотъемлемое, запечатлевая твоими догматы, небоявленне преподобне Василие.',
      'ro': 'Întărirea Bisericii te-ai arătat, dând întregii omeniri o stăpânire de care nu poate fi lipsită, pecetluind cu învățăturile tale, ceresc-arătătorule, sfinte Vasile.'
    }
  };

  return kontakia[saintId]?.[lang] || kontakia[saintId]?.['en'] || null;
}

function getHymns(saintId, lang) {
  // Return an array of hymns for special saints
  return [];
}

// GET /api/calendar/records/:date - Get associated records for a specific date
router.get('/records/:date', async (req, res) => {
  try {
    const { date } = req.params;

    // Query the database for records on this date
    const [baptismRecords] = await promisePool.query(
      'SELECT id, child_first_name, child_last_name, ceremony_date FROM baptism_records WHERE DATE(ceremony_date) = ?',
      [date]
    );

    const [marriageRecords] = await promisePool.query(
      'SELECT id, groom_first_name, groom_last_name, bride_first_name, bride_last_name, ceremony_date FROM marriage_records WHERE DATE(ceremony_date) = ?',
      [date]
    );

    const [funeralRecords] = await promisePool.query(
      'SELECT id, deceased_first_name, deceased_last_name, ceremony_date FROM funeral_records WHERE DATE(ceremony_date) = ?',
      [date]
    );

    const associatedRecords = [];

    // Add baptism records
    baptismRecords.forEach(record => {
      associatedRecords.push({
        id: `baptism-${record.id}`,
        type: 'baptism',
        recordId: record.id.toString(),
        description: `Baptism of ${record.child_first_name} ${record.child_last_name}`,
        date: record.ceremony_date,
        participants: [`${record.child_first_name} ${record.child_last_name}`],
        location: 'Church'
      });
    });

    // Add marriage records
    marriageRecords.forEach(record => {
      associatedRecords.push({
        id: `marriage-${record.id}`,
        type: 'marriage',
        recordId: record.id.toString(),
        description: `Marriage of ${record.groom_first_name} ${record.groom_last_name} and ${record.bride_first_name} ${record.bride_last_name}`,
        date: record.ceremony_date,
        participants: [`${record.groom_first_name} ${record.groom_last_name}`, `${record.bride_first_name} ${record.bride_last_name}`],
        location: 'Church'
      });
    });

    // Add funeral records
    funeralRecords.forEach(record => {
      associatedRecords.push({
        id: `funeral-${record.id}`,
        type: 'funeral',
        recordId: record.id.toString(),
        description: `Funeral of ${record.deceased_first_name} ${record.deceased_last_name}`,
        date: record.ceremony_date,
        participants: [`${record.deceased_first_name} ${record.deceased_last_name}`],
        location: 'Church'
      });
    });

    res.json(associatedRecords);
  } catch (error) {
    console.error('Associated records API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/calendar/commemorations - Create a new local commemoration
router.post('/commemorations', async (req, res) => {
  try {
    const { name, nameTranslations, date, description, descriptionTranslations, isRecurring } = req.body;

    if (!req.session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Insert into database (you'll need to create this table)
    const [result] = await promisePool.query(
      'INSERT INTO local_commemorations (name, name_translations, date, description, description_translations, is_recurring, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [
        name,
        JSON.stringify(nameTranslations || {}),
        date,
        description,
        JSON.stringify(descriptionTranslations || {}),
        isRecurring || false,
        req.session.user.id
      ]
    );

    const commemoration = {
      id: result.insertId,
      name,
      nameTranslations,
      date,
      description,
      descriptionTranslations,
      isRecurring,
      createdBy: req.session.user.id,
      createdAt: new Date()
    };

    res.status(201).json(commemoration);
  } catch (error) {
    console.error('Create commemoration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calendar/export/:format - Export calendar data
router.get('/export/:format', async (req, res) => {
  try {
    const { format } = req.params;
    const { year = new Date().getFullYear(), lang = 'en' } = req.query;

    if (!['pdf', 'ical', 'csv', 'json'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format' });
    }

    // Get calendar data
    const calendarResponse = await router.get(`/${lang}/${year}`);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="calendar-${year}.json"`);
      return res.json(calendarResponse);
    }

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="calendar-${year}.csv"`);

      let csv = 'Date,Type,Name,Description\n';
      // Add CSV generation logic here

      return res.send(csv);
    }

    if (format === 'ical') {
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', `attachment; filename="calendar-${year}.ics"`);

      let ical = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Orthodox Church//Liturgical Calendar//EN\n';
      // Add iCal generation logic here
      ical += 'END:VCALENDAR';

      return res.send(ical);
    }

    if (format === 'pdf') {
      // PDF generation would require additional libraries like PDFKit
      return res.status(501).json({ error: 'PDF export not implemented' });
    }

  } catch (error) {
    console.error('Export calendar error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calendar/pascha/:year - Calculate Pascha and movable feasts for a year
router.get('/pascha/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);

    if (year < 1900 || year > 2100) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    const pascha = calculatePascha(year);

    // Calculate all movable feasts
    const palmSunday = new Date(pascha);
    palmSunday.setDate(pascha.getDate() - 7);

    const lazarusSaturday = new Date(pascha);
    lazarusSaturday.setDate(pascha.getDate() - 8);

    const holyWeekStart = new Date(palmSunday);
    const holyWeekEnd = new Date(pascha);
    holyWeekEnd.setDate(pascha.getDate() - 1);

    const brightWeekStart = new Date(pascha);
    const brightWeekEnd = new Date(pascha);
    brightWeekEnd.setDate(pascha.getDate() + 6);

    const pentecost = new Date(pascha);
    pentecost.setDate(pascha.getDate() + 49);

    const allSaints = new Date(pascha);
    allSaints.setDate(pascha.getDate() + 56);

    // Lent starts 48 days before Pascha
    const lentStart = new Date(pascha);
    lentStart.setDate(pascha.getDate() - 48);

    // Meatfare Sunday (last day to eat meat) - 56 days before Pascha
    const meatfare = new Date(pascha);
    meatfare.setDate(pascha.getDate() - 56);

    // Cheesefare Sunday (last day to eat dairy) - 49 days before Pascha
    const cheesefare = new Date(pascha);
    cheesefare.setDate(pascha.getDate() - 49);

    // St. Peter and Paul Fast starts on the Monday after All Saints
    const stPeterPaulFastStart = new Date(allSaints);
    stPeterPaulFastStart.setDate(allSaints.getDate() + 1);
    const stPeterPaulFastEnd = new Date(year, 6, 12); // July 12 (June 29 OS)

    // Dormition Fast: August 1-15
    const dormitionFastStart = new Date(year, 7, 1);
    const dormitionFastEnd = new Date(year, 7, 15);

    // Nativity Fast: November 15 - December 25
    const nativityFastStart = new Date(year, 10, 15);
    const nativityFastEnd = new Date(year, 11, 25);

    const paschalData = {
      year,
      pascha: cleanRecord({ date: pascha }).date,
      palmSunday: cleanRecord({ date: palmSunday }).date,
      lazarusSaturday: cleanRecord({ date: lazarusSaturday }).date,
      holyWeek: {
        start: cleanRecord({ date: holyWeekStart }).date,
        end: cleanRecord({ date: holyWeekEnd }).date
      },
      brightWeek: {
        start: cleanRecord({ date: brightWeekStart }).date,
        end: cleanRecord({ date: brightWeekEnd }).date
      },
      pentecost: cleanRecord({ date: pentecost }).date,
      allSaints: cleanRecord({ date: allSaints }).date,
      stPeterPaulFast: {
        start: cleanRecord({ date: stPeterPaulFastStart }).date,
        end: cleanRecord({ date: stPeterPaulFastEnd }).date
      },
      dormitionFast: {
        start: cleanRecord({ date: dormitionFastStart }).date,
        end: cleanRecord({ date: dormitionFastEnd }).date
      },
      nativityFast: {
        start: cleanRecord({ date: nativityFastStart }).date,
        end: cleanRecord({ date: nativityFastEnd }).date
      },
      cheesefare: cleanRecord({ date: cheesefare }).date,
      meatfare: cleanRecord({ date: meatfare }).date,
      lentStart: cleanRecord({ date: lentStart }).date
    };

    res.json(paschalData);
  } catch (error) {
    console.error('Pascha calculation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calendar/today - Get today's liturgical information
router.get('/today', async (req, res) => {
  try {
    const { lang = 'en' } = req.query;
    const today = new Date();
    const year = today.getFullYear();

    // Get Pascha data for this year
    const pascha = calculatePascha(year);

    // Calculate current liturgical information
    const tone = getTone(today, pascha);
    const season = getSeason(today, pascha);
    const fastingInfo = getFastingInfo(today, pascha, lang);

    // Get today's saints and feasts
    const movableFeasts = calculateMovableFeasts(year);
    const fixedFeasts = LITURGICAL_DATA[lang] || LITURGICAL_DATA['en'];

    const dateKey = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todaysFeasts = [...(fixedFeasts[dateKey] || []), ...(movableFeasts[dateKey] || [])];

    const feasts = todaysFeasts.filter(f => f.type === 'feast');
    const saints = todaysFeasts.filter(f => f.type !== 'feast');

    const dayData = { feasts, saints };
    const color = getLiturgicalColor(today, pascha, dayData);

    const todayData = {
      date: cleanRecord({ date: today }).date,
      tone,
      season,
      liturgicalColor: color,
      fasting: fastingInfo,
      feasts: feasts,
      saints: saints,
      readings: todaysFeasts.length > 0 ? todaysFeasts[0].readings : null,
      // Additional liturgical information
      weekOfYear: Math.ceil((today.getTime() - new Date(year, 0, 1).getTime()) / (1000 * 60 * 60 * 24 * 7)),
      dayOfYear: Math.ceil((today.getTime() - new Date(year, 0, 1).getTime()) / (1000 * 60 * 60 * 24)),
      ecclesiasticalDate: getEcclesiasticalDate(today, pascha, lang),
      matinsGospel: getMatinsGospel(today, pascha, lang),
      specialObservances: getSpecialObservances(today, pascha, lang)
    };

    res.json(todayData);
  } catch (error) {
    console.error('Today liturgical data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions for today's liturgical information
function getEcclesiasticalDate(date, pascha, lang) {
  const daysSincePascha = Math.floor((date.getTime() - pascha.getTime()) / (1000 * 60 * 60 * 24));
  const weeksSincePascha = Math.floor(daysSincePascha / 7);

  if (daysSincePascha >= 0 && daysSincePascha <= 6) {
    const dayNames = {
      'en': ['Pascha', 'Bright Monday', 'Bright Tuesday', 'Bright Wednesday', 'Bright Thursday', 'Bright Friday', 'Bright Saturday'],
      'gr': ['Πάσχα', 'Δευτέρα της Διακαινησίμου', 'Τρίτη της Διακαινησίμου', 'Τετάρτη της Διακαινησίμου', 'Πέμπτη της Διακαινησίμου', 'Παρασκευή της Διακαινησίμου', 'Σάββατο της Διακαινησίμου'],
      'ru': ['Пасха', 'Светлый понедельник', 'Светлый вторник', 'Светлая среда', 'Светлый четверг', 'Светлая пятница', 'Светлая суббота'],
      'ro': ['Paști', 'Luni Luminată', 'Marți Luminată', 'Miercuri Luminată', 'Joi Luminată', 'Vineri Luminată', 'Sâmbăta Luminată']
    };
    return dayNames[lang][daysSincePascha] || dayNames['en'][daysSincePascha];
  }

  if (daysSincePascha > 6 && daysSincePascha <= 49) {
    const weekNames = {
      'en': `${weeksSincePascha} Sunday after Pascha`,
      'gr': `${weeksSincePascha}η Κυριακή μετά το Πάσχα`,
      'ru': `${weeksSincePascha}-я неделя по Пасхе`,
      'ro': `Duminica ${weeksSincePascha} după Paști`
    };
    return weekNames[lang] || weekNames['en'];
  }

  return null;
}

function getMatinsGospel(date, pascha, lang) {
  const dayOfWeek = date.getDay();
  const daysSincePascha = Math.floor((date.getTime() - pascha.getTime()) / (1000 * 60 * 60 * 24));

  // During Bright Week, use specific resurrectional readings
  if (daysSincePascha >= 0 && daysSincePascha <= 6) {
    const brightWeekGospels = [
      { ref: 'Matthew 28:16-20', text: 'The eleven disciples went to Galilee...' },
      { ref: 'Mark 16:1-8', text: 'When the Sabbath was over...' },
      { ref: 'Luke 24:13-35', text: 'Now that same day two of them...' },
      { ref: 'John 20:1-10', text: 'Early on the first day of the week...' },
      { ref: 'John 20:11-18', text: 'Now Mary stood outside the tomb...' },
      { ref: 'John 20:19-31', text: 'On the evening of that first day...' },
      { ref: 'John 21:1-14', text: 'Afterward Jesus appeared again...' }
    ];
    return brightWeekGospels[daysSincePascha];
  }

  // For Sundays, use the appropriate resurrectional gospel
  if (dayOfWeek === 0) {
    const tone = getTone(date, pascha);
    const resurrectionalGospels = [
      { ref: 'Matthew 28:16-20', text: 'The eleven disciples went to Galilee...' },
      { ref: 'Mark 16:1-8', text: 'When the Sabbath was over...' },
      { ref: 'Luke 24:13-35', text: 'Now that same day two of them...' },
      { ref: 'John 20:1-10', text: 'Early on the first day of the week...' },
      { ref: 'John 20:11-18', text: 'Now Mary stood outside the tomb...' },
      { ref: 'John 20:19-31', text: 'On the evening of that first day...' },
      { ref: 'John 21:1-14', text: 'Afterward Jesus appeared again...' },
      { ref: 'Matthew 28:1-10', text: 'After the Sabbath, at dawn...' }
    ];
    return resurrectionalGospels[tone - 1];
  }

  return null;
}

function getSpecialObservances(date, pascha, lang) {
  const observances = [];
  const daysSincePascha = Math.floor((date.getTime() - pascha.getTime()) / (1000 * 60 * 60 * 24));

  // Add special observances based on the liturgical calendar
  if (daysSincePascha >= 0 && daysSincePascha <= 6) {
    observances.push({
      name: lang === 'en' ? 'Bright Week' :
        lang === 'gr' ? 'Διακαινήσιμος' :
          lang === 'ru' ? 'Светлая седмица' :
            'Săptămâna Luminată',
      description: lang === 'en' ? 'No fasting, special services' :
        lang === 'gr' ? 'Δεν υπάρχει νηστεία, ειδικές ακολουθίες' :
          lang === 'ru' ? 'Нет поста, особые службы' :
            'Fără post, servicii speciale'
    });
  }

  return observances;
}

// Helper function to get tone of the week
function getTone(date, pascha) {
  const daysSincePascha = Math.floor((date.getTime() - pascha.getTime()) / (1000 * 60 * 60 * 24));
  const weeksSincePascha = Math.floor(daysSincePascha / 7);
  const tone = ((weeksSincePascha - 1) % 8) + 1;
  return tone < 1 ? 8 : tone > 8 ? 1 : tone;
}

// Helper function to get liturgical season
function getSeason(date, pascha) {
  const daysSincePascha = Math.floor((date.getTime() - pascha.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSincePascha >= 0 && daysSincePascha <= 6) {
    return 'Bright Week';
  }

  if (daysSincePascha >= -48 && daysSincePascha < 0) {
    return 'Great Lent';
  }

  if (daysSincePascha >= -7 && daysSincePascha <= -1) {
    return 'Holy Week';
  }

  if (daysSincePascha >= 0 && daysSincePascha <= 56) {
    return 'Pentecostarion';
  }

  const month = date.getMonth();
  if (month >= 10 || month <= 1) {
    return 'Nativity Season';
  }

  return 'Ordinary Time';
}

// Helper function to check if it's a fast day
function checkFastDay(date, pascha) {
  const dayOfWeek = date.getDay();
  const daysSincePascha = Math.floor((date.getTime() - pascha.getTime()) / (1000 * 60 * 60 * 24));

  // Great Lent
  if (daysSincePascha >= -48 && daysSincePascha < 0) {
    return true;
  }

  // Check for other fasting periods (Dormition, Nativity, etc.)
  const month = date.getMonth();
  const day = date.getDate();

  // Dormition Fast: August 1-15
  if (month === 7 && day >= 1 && day <= 15) {
    return true;
  }

  // Nativity Fast: November 15 - December 25
  if ((month === 10 && day >= 15) || (month === 11 && day <= 25)) {
    return true;
  }

  // Wednesday and Friday fasts (except during fast-free periods)
  if (dayOfWeek === 3 || dayOfWeek === 5) {
    // Not during Bright Week
    if (!(daysSincePascha >= 0 && daysSincePascha <= 6)) {
      return true;
    }
  }

  return false;
}

module.exports = router;
