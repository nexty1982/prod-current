// server/services/testChurchDataGenerator.js
const bcrypt = require('bcrypt');

/**
 * Test Church Data Generator Service
 * Generates realistic Orthodox church sample data for testing and demonstration
 */
class TestChurchDataGenerator {
  
  constructor() {
    this.orthodoxNames = {
      male: [
        'Dimitrios', 'Nicholas', 'Constantine', 'Michael', 'John', 'George', 'Peter', 'Stephen',
        'Alexander', 'Theodore', 'Anthony', 'Andrew', 'Matthew', 'Mark', 'Luke', 'Paul',
        'Basil', 'Gregory', 'Christopher', 'Daniel', 'Thomas', 'James', 'Maximos', 'Spyridon'
      ],
      female: [
        'Maria', 'Helen', 'Catherine', 'Anna', 'Christina', 'Sophia', 'Elizabeth', 'Theodora',
        'Margaret', 'Barbara', 'Anastasia', 'Victoria', 'Alexandra', 'Irene', 'Georgia', 'Photini',
        'Eugenia', 'Paraskevi', 'Chrysanthi', 'Vassiliki', 'Despina', 'Kalliopi', 'Stavroula'
      ]
    };

    this.orthodoxSurnames = [
      'Papadopoulos', 'Christopoulos', 'Dimitriou', 'Nikolaou', 'Georgios', 'Konstantinou',
      'Stefanopoulos', 'Alexandrou', 'Michaelides', 'Petrou', 'Andreou', 'Ioannou',
      'Theodoros', 'Markos', 'Loukas', 'Pavlos', 'Basilios', 'Grigorios', 'Athanasios',
      'Kostas', 'Yannis', 'Stavros', 'Nikos', 'Manolis', 'Vasilis', 'Thanasis'
    ];

    this.clergyTitles = [
      'Father', 'Archimandrite', 'Bishop', 'Deacon', 'Protodeacon', 'Archdeacon'
    ];

    this.cities = [
      'Athens', 'Thessaloniki', 'New York', 'Chicago', 'Boston', 'Detroit', 'Los Angeles',
      'San Francisco', 'Toronto', 'Montreal', 'Melbourne', 'Sydney', 'London', 'Paris'
    ];

    this.streets = [
      'Orthodox Way', 'Church Street', 'Cathedral Avenue', 'Saint Nicholas Drive',
      'Holy Trinity Road', 'Byzantine Boulevard', 'Monastery Lane', 'Icon Court',
      'Liturgy Circle', 'Patriarch Path', 'Divine Street', 'Sacred Heart Lane'
    ];
  }

  /**
   * Generate random Orthodox name
   */
  generateName(gender) {
    const names = this.orthodoxNames[gender];
    const firstName = names[Math.floor(Math.random() * names.length)];
    const lastName = this.orthodoxSurnames[Math.floor(Math.random() * this.orthodoxSurnames.length)];
    return { firstName, lastName, fullName: `${firstName} ${lastName}` };
  }

  /**
   * Generate random date within range
   */
  generateRandomDate(startYear, endYear) {
    const start = new Date(startYear, 0, 1);
    const end = new Date(endYear, 11, 31);
    const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
    return new Date(randomTime);
  }

  /**
   * Generate random address
   */
  generateAddress() {
    const streetNumber = Math.floor(Math.random() * 9999) + 1;
    const street = this.streets[Math.floor(Math.random() * this.streets.length)];
    const city = this.cities[Math.floor(Math.random() * this.cities.length)];
    
    return {
      address: `${streetNumber} ${street}`,
      city: city,
      state: city.includes('New York') || city.includes('Chicago') ? 'New York' : 'Various',
      postal_code: String(Math.floor(Math.random() * 90000) + 10000),
      country: 'United States'
    };
  }

  /**
   * Generate clergy members
   */
  generateClergy(count = 5) {
    const clergy = [];
    
    for (let i = 0; i < count; i++) {
      const name = this.generateName('male');
      const title = this.clergyTitles[Math.floor(Math.random() * this.clergyTitles.length)];
      const address = this.generateAddress();
      
      clergy.push({
        church_id: 1,
        name: name.fullName,
        title: title,
        email: `${name.firstName.toLowerCase()}.${name.lastName.toLowerCase()}@church.org`,
        phone: `(555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        role: title === 'Father' || title === 'Archimandrite' ? 'priest' : 
              title === 'Bishop' ? 'bishop' : 'deacon',
        is_active: true,
        created_at: this.generateRandomDate(2020, 2025),
        updated_at: this.generateRandomDate(2020, 2025)
      });
    }
    
    return clergy;
  }

  /**
   * Generate baptism records
   */
  generateBaptismRecords(count = 50) {
    const records = [];
    
    for (let i = 0; i < count; i++) {
      const childName = this.generateName(Math.random() > 0.5 ? 'male' : 'female');
      const father = this.generateName('male');
      const mother = this.generateName('female');
      const godparent = this.generateName(Math.random() > 0.5 ? 'male' : 'female');
      const priest = this.generateName('male');
      const address = this.generateAddress();
      
      const birthDate = this.generateRandomDate(2020, 2024);
      const baptismDate = new Date(birthDate.getTime() + (Math.random() * 365 * 24 * 60 * 60 * 1000)); // Within a year of birth
      
      records.push({
        church_id: 1,
        first_name: childName.firstName,
        last_name: childName.lastName,
        date_of_birth: birthDate.toISOString().split('T')[0],
        date_of_baptism: baptismDate.toISOString().split('T')[0],
        place_of_birth: address.city,
        place_of_baptism: 'St. Nicholas Orthodox Church',
        father_name: father.fullName,
        mother_name: mother.fullName,
        godparents: godparent.fullName,
        priest_name: `Father ${priest.firstName} ${priest.lastName}`,
        notes: `Baptism conducted in the Orthodox tradition. Registry #${1000 + i}`,
        created_at: baptismDate,
        updated_at: baptismDate
      });
    }
    
    return records;
  }

  /**
   * Generate marriage records
   */
  generateMarriageRecords(count = 25) {
    const records = [];
    
    for (let i = 0; i < count; i++) {
      const groom = this.generateName('male');
      const bride = this.generateName('female');
      const priest = this.generateName('male');
      const witness1 = this.generateName(Math.random() > 0.5 ? 'male' : 'female');
      const witness2 = this.generateName(Math.random() > 0.5 ? 'male' : 'female');
      const address = this.generateAddress();
      
      const marriageDate = this.generateRandomDate(2020, 2024);
      
      records.push({
        church_id: 1,
        groom_first_name: groom.firstName,
        groom_last_name: groom.lastName,
        bride_first_name: bride.firstName,
        bride_last_name: bride.lastName,
        marriage_date: marriageDate.toISOString().split('T')[0],
        place_of_marriage: 'St. Nicholas Orthodox Church',
        priest_name: `Father ${priest.firstName} ${priest.lastName}`,
        witness1_name: witness1.fullName,
        witness2_name: witness2.fullName,
        license_number: `ML-${2024}-${String(i + 1).padStart(4, '0')}`,
        notes: `Orthodox marriage ceremony conducted according to tradition. Registry #${2000 + i}`,
        created_at: marriageDate,
        updated_at: marriageDate
      });
    }
    
    return records;
  }

  /**
   * Generate funeral records
   */
  generateFuneralRecords(count = 15) {
    const records = [];
    
    for (let i = 0; i < count; i++) {
      const deceased = this.generateName(Math.random() > 0.5 ? 'male' : 'female');
      const priest = this.generateName('male');
      const address = this.generateAddress();
      
      const birthDate = this.generateRandomDate(1930, 1980);
      const deathDate = this.generateRandomDate(2020, 2024);
      const funeralDate = new Date(deathDate.getTime() + (Math.random() * 7 * 24 * 60 * 60 * 1000)); // Within a week
      
      records.push({
        church_id: 1,
        first_name: deceased.firstName,
        last_name: deceased.lastName,
        date_of_birth: birthDate.toISOString().split('T')[0],
        date_of_death: deathDate.toISOString().split('T')[0],
        date_of_funeral: funeralDate.toISOString().split('T')[0],
        place_of_death: address.city,
        place_of_funeral: 'St. Nicholas Orthodox Church',
        priest_name: `Father ${priest.firstName} ${priest.lastName}`,
        burial_location: `${address.city} Orthodox Cemetery`,
        cause_of_death: Math.random() > 0.5 ? 'Natural causes' : 'Age-related illness',
        notes: `Memorial service conducted in the Orthodox tradition. May their memory be eternal. Registry #${3000 + i}`,
        created_at: funeralDate,
        updated_at: funeralDate
      });
    }
    
    return records;
  }

  /**
   * Generate church users
   */
  async generateUsers(count = 8) {
    const users = [];
    const saltRounds = 10;
    
    for (let i = 0; i < count; i++) {
      const user = this.generateName(Math.random() > 0.5 ? 'male' : 'female');
      const hashedPassword = await bcrypt.hash('password123', saltRounds);
      
      const role = i === 0 ? 'admin' : 
                   i === 1 ? 'editor' : 
                   Math.random() > 0.7 ? 'editor' : 'user';
      
      users.push({
        church_id: 1,
        username: `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}`,
        email: `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}@church.org`,
        password: hashedPassword,
        full_name: user.fullName,
        role: role,
        is_active: true,
        created_at: this.generateRandomDate(2020, 2025),
        updated_at: this.generateRandomDate(2020, 2025)
      });
    }
    
    return users;
  }

  /**
   * Generate church settings
   */
  generateChurchSettings() {
    return [
      {
        church_id: 1,
        setting_key: 'allow_public_registration',
        setting_value: 'false',
        setting_type: 'boolean'
      },
      {
        church_id: 1,
        setting_key: 'notification_email',
        setting_value: 'admin@church.org',
        setting_type: 'string'
      },
      {
        church_id: 1,
        setting_key: 'calendar_type',
        setting_value: 'gregorian',
        setting_type: 'string'
      },
      {
        church_id: 1,
        setting_key: 'max_records_per_page',
        setting_value: '50',
        setting_type: 'number'
      },
      {
        church_id: 1,
        setting_key: 'backup_frequency',
        setting_value: 'weekly',
        setting_type: 'string'
      }
    ];
  }

  /**
   * Generate branding settings
   */
  generateBranding() {
    return {
      church_id: 1,
      logo_path: null,
      primary_color: '#1976d2',
      secondary_color: '#dc004e',
      ag_grid_theme: 'ag-theme-alpine'
    };
  }

  /**
   * Generate complete test church data package
   */
  async generateCompleteTestData(options = {}) {
    const {
      baptismCount = 50,
      marriageCount = 25,
      funeralCount = 15,
      clergyCount = 5,
      userCount = 8
    } = options;

    return {
      clergy: this.generateClergy(clergyCount),
      baptismRecords: this.generateBaptismRecords(baptismCount),
      marriageRecords: this.generateMarriageRecords(marriageCount),
      funeralRecords: this.generateFuneralRecords(funeralCount),
      users: await this.generateUsers(userCount),
      settings: this.generateChurchSettings(),
      branding: this.generateBranding()
    };
  }
}

module.exports = TestChurchDataGenerator;
