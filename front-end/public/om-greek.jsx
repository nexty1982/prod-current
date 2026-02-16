<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Διαχείριση Εκκλησιαστικών Αρχείων | OrthodoxMetrics.com</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --orthodox-gold: #DAA520;
            --orthodox-blue: #4169E1;
            --orthodox-red: #DC143C;
            --orthodox-purple: #800080;
            --orthodox-green: #228B22;
            --orthodox-white: #FFFFFF;
            --orthodox-black: #2F2F2F;
        }
        
        .hero-section {
            background: linear-gradient(135deg, var(--orthodox-blue) 0%, var(--orthodox-gold) 100%);
            color: white;
            padding: 80px 0;
        }
        
        .liturgical-swatch {
            width: 120px;
            height: 80px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 0.8rem;
            text-align: center;
            margin: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            transition: transform 0.3s ease;
        }
        
        .liturgical-swatch:hover {
            transform: translateY(-5px);
        }
        
        .paschal-white { background-color: #FFFFFF; color: #333; }
        .feast-gold { background-color: #FFD700; color: #333; }
        .lenten-purple { background-color: #800080; }
        .pentecost-green { background-color: #228B22; }
        .martyr-red { background-color: #DC143C; }
        .theotokos-blue { background-color: #4169E1; }
        .funeral-black { background-color: #2F2F2F; }
        .triumphal-red { background-color: #FF0000; }
        
        .record-card {
            border-left: 4px solid var(--orthodox-gold);
            transition: all 0.3s ease;
        }
        
        .record-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
        
        .section-icon {
            font-size: 3rem;
            color: var(--orthodox-gold);
            margin-bottom: 1rem;
        }
        
        .pricing-card {
            border: 2px solid var(--orthodox-gold);
            transition: all 0.3s ease;
        }
        
        .pricing-card:hover {
            border-color: var(--orthodox-blue);
            transform: scale(1.05);
        }
        
        .pricing-card.featured {
            border-color: var(--orthodox-red);
            background: linear-gradient(145deg, #fff 0%, #f8f9fa 100%);
        }
        
        @media (max-width: 768px) {
            .hero-section {
                padding: 40px 0;
            }
            
            .liturgical-swatch {
                width: 80px;
                height: 60px;
                font-size: 0.7rem;
                margin: 5px;
            }
            
            .section-icon {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark" style="background-color: var(--orthodox-blue);">
        <div class="container">
            <a class="navbar-brand fw-bold" href="#">
                <i class="fas fa-cross me-2"></i>OrthodoxMetrics
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item"><a class="nav-link" href="#records">Αρχεία</a></li>
                    <li class="nav-item"><a class="nav-link" href="#themes">Θέματα</a></li>
                    <li class="nav-item"><a class="nav-link" href="#pricing">Τιμές</a></li>
                    <li class="nav-item"><a class="nav-link" href="#contact">Επικοινωνία</a></li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero-section text-center">
        <div class="container">
            <div class="row">
                <div class="col-lg-8 mx-auto">
                    <h1 class="display-4 fw-bold mb-4">Διαχείριση Εκκλησιαστικών Αρχείων</h1>
                    <p class="lead mb-4">Ολοκληρωμένη ψηφιακή λύση για τη διαχείριση αρχείων Βαπτίσεων, Γάμων και Κηδειών με λειτουργική ακρίβεια και Ορθόδοξη παράδοση.</p>
                    <div class="d-flex flex-wrap justify-content-center gap-3">
                        <a href="#contact" class="btn btn-light btn-lg">Ξεκινήστε</a>
                        <a href="#records" class="btn btn-outline-light btn-lg">Δείτε Παραδείγματα</a>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Liturgical Color Themes -->
    <section id="themes" class="py-5 bg-light">
        <div class="container">
            <div class="text-center mb-5">
                <h2 class="fw-bold">Λειτουργικά Χρωματικά Θέματα</h2>
                <p class="text-muted">Βιώστε την ομορφιά των Ορθοδόξων λειτουργικών εποχών μέσα από τη χρωματικά κωδικοποιημένη διεπαφή μας</p>
            </div>
            <div class="row justify-content-center">
                <div class="col-12">
                    <div class="d-flex flex-wrap justify-content-center">
                        <div class="liturgical-swatch paschal-white">Πασχάλιο<br>Λευκό</div>
                        <div class="liturgical-swatch feast-gold">Εορταστικό<br>Χρυσό</div>
                        <div class="liturgical-swatch lenten-purple">Νηστίσιμο<br>Μωβ</div>
                        <div class="liturgical-swatch pentecost-green">Πεντηκοστή<br>Πράσινο</div>
                        <div class="liturgical-swatch martyr-red">Μαρτυρικό<br>Κόκκινο</div>
                        <div class="liturgical-swatch theotokos-blue">Θεοτοκικό<br>Μπλε</div>
                        <div class="liturgical-swatch funeral-black">Κηδειώδες<br>Μαύρο</div>
                        <div class="liturgical-swatch triumphal-red">Θριαμβικό<br>Κόκκινο</div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Example Church Records -->
    <section id="records" class="py-5">
        <div class="container">
            <div class="text-center mb-5">
                <h2 class="fw-bold">Παραδείγματα Εκκλησιαστικών Αρχείων</h2>
                <p class="text-muted">Δείγματα αρχείων που παρουσιάζουν το ολοκληρωμένο σύστημα διαχείρισής μας</p>
            </div>

            <!-- Baptism Records -->
            <div class="row mb-5">
                <div class="col-12">
                    <div class="text-center mb-4">
                        <i class="fas fa-water section-icon"></i>
                        <h3>Αρχεία Βαπτίσεων</h3>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead class="table-primary">
                                <tr>
                                    <th>Ημερομηνία Βάπτισης</th>
                                    <th>Όνομα</th>
                                    <th>Νονός</th>
                                    <th>Ιερέας</th>
                                    <th>Εκκλησία</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>04/08/2023</td>
                                    <td>Αστέρω Περράκης</td>
                                    <td>Λεωνίδας Κυπραίος</td>
                                    <td>Πάτερ Άνθιμος</td>
                                    <td>Ι.Ν. Φλώρινα</td>
                                </tr>
                                <tr>
                                    <td>15/11/2024</td>
                                    <td>Νικόλαος Καραγιάννης</td>
                                    <td>Τιμόθεος Βλάχος</td>
                                    <td>Πάτερ Δημήτριος</td>
                                    <td>Ι.Ν. Θεσσαλονίκη</td>
                                </tr>
                                <tr>
                                    <td>22/03/2024</td>
                                    <td>Μαρία Παπαδάκη</td>
                                    <td>Ελένη Κωνσταντίνου</td>
                                    <td>Πάτερ Γεώργιος</td>
                                    <td>Ι.Ν. Πάτρα</td>
                                </tr>
                                <tr>
                                    <td>10/05/2023</td>
                                    <td>Ιωάννης Αλεξάνδρου</td>
                                    <td>Μιχαήλ Παπαδόπουλος</td>
                                    <td>Πάτερ Χρίστος</td>
                                    <td>Ι.Ν. Καλαμάτα</td>
                                </tr>
                                <tr>
                                    <td>18/09/2024</td>
                                    <td>Σοφία Νικολάου</td>
                                    <td>Αναστασία Θεοδώρου</td>
                                    <td>Πάτερ Παντελεήμων</td>
                                    <td>Ι.Ν. Λάρισα</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Marriage Records -->
            <div class="row mb-5">
                <div class="col-12">
                    <div class="text-center mb-4">
                        <i class="fas fa-rings-wedding section-icon"></i>
                        <h3>Αρχεία Γάμων</h3>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead class="table-success">
                                <tr>
                                    <th>Ημερομηνία Γάμου</th>
                                    <th>Γαμπρός</th>
                                    <th>Νύφη</th>
                                    <th>Ιερέας</th>
                                    <th>Εκκλησία</th>
                                    <th>Μάρτυρας</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>02/03/2025</td>
                                    <td>Ασημής Τσαλαμάνδρης</td>
                                    <td>Αρχοντία Μιλέα</td>
                                    <td>Πάτερ Θησεύς</td>
                                    <td>Ι.Ν. Ερμούπολη</td>
                                    <td>Δημήτρης-Βικέντιος Ευκαρπίδης</td>
                                </tr>
                                <tr>
                                    <td>15/08/2024</td>
                                    <td>Κωνσταντίνος Παπαγεωργίου</td>
                                    <td>Μαρία Αντωνίου</td>
                                    <td>Πάτερ Νικόλαος</td>
                                    <td>Ι.Ν. Ρόδος</td>
                                    <td>Γιάννης Στεφανάκης</td>
                                </tr>
                                <tr>
                                    <td>20/05/2024</td>
                                    <td>Παναγιώτης Δημητρίου</td>
                                    <td>Ευαγγελία Καρανικόλα</td>
                                    <td>Πάτερ Σπυρίδων</td>
                                    <td>Ι.Ν. Κέρκυρα</td>
                                    <td>Αντώνης Μαυρίδης</td>
                                </tr>
                                <tr>
                                    <td>12/09/2023</td>
                                    <td>Θεόδωρος Καλογιάννης</td>
                                    <td>Αικατερίνη Βασιλείου</td>
                                    <td>Πάτερ Ιωάννης</td>
                                    <td>Ι.Ν. Χανιά</td>
                                    <td>Μιχάλης Κωσταράκος</td>
                                </tr>
                                <tr>
                                    <td>03/11/2024</td>
                                    <td>Γεώργιος Αθανασίου</td>
                                    <td>Χριστίνα Λεκάκη</td>
                                    <td>Πάτερ Διονύσιος</td>
                                    <td>Ι.Ν. Βόλος</td>
                                    <td>Σπύρος Τσίγκας</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Funeral Records -->
            <div class="row mb-5">
                <div class="col-12">
                    <div class="text-center mb-4">
                        <i class="fas fa-cross section-icon"></i>
                        <h3>Αρχεία Κηδειών</h3>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead class="table-secondary">
                                <tr>
                                    <th>Ημερομηνία Κηδείας</th>
                                    <th>Όνομα</th>
                                    <th>Ηλικία</th>
                                    <th>Ημερομηνία Θανάτου</th>
                                    <th>Οικογένεια</th>
                                    <th>Ιερέας</th>
                                    <th>Τοποθεσία Ταφής</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>07/02/2025</td>
                                    <td>Κλειώ Δίγκας</td>
                                    <td>88</td>
                                    <td>29/08/2024</td>
                                    <td>Κυριαζής-Νεκτάριος Γρηγορίου</td>
                                    <td>Πάτερ Καλλιόπη</td>
                                    <td>Ρέθυμνο</td>
                                </tr>
                                <tr>
                                    <td>18/04/2025</td>
                                    <td>Ανδρέας Κωνσταντινίδης</td>
                                    <td>92</td>
                                    <td>15/04/2025</td>
                                    <td>Ελένη Κωνσταντινίδου</td>
                                    <td>Πάτερ Μιχαήλ</td>
                                    <td>Αθήνα</td>
                                </tr>
                                <tr>
                                    <td>25/03/2025</td>
                                    <td>Μαρία Παπαδοπούλου</td>
                                    <td>76</td>
                                    <td>22/03/2025</td>
                                    <td>Νίκος Παπαδόπουλος</td>
                                    <td>Πάτερ Στέφανος</td>
                                    <td>Πειραιάς</td>
                                </tr>
                                <tr>
                                    <td>10/01/2025</td>
                                    <td>Γεώργιος Αλεξανδράκης</td>
                                    <td>68</td>
                                    <td>08/01/2025</td>
                                    <td>Αντωνία Αλεξανδράκη</td>
                                    <td>Πάτερ Κωνσταντίνος</td>
                                    <td>Ηράκλειο</td>
                                </tr>
                                <tr>
                                    <td>30/12/2024</td>
                                    <td>Παναγιώτα Νικολάου</td>
                                    <td>84</td>
                                    <td>28/12/2024</td>
                                    <td>Δημήτρης Νικολάου</td>
                                    <td>Πάτερ Αντώνιος</td>
                                    <td>Καβάλα</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="py-5 bg-light">
        <div class="container">
            <div class="text-center mb-5">
                <h2 class="fw-bold">Πακέτα Υπηρεσιών</h2>
                <p class="text-muted">Επιλέξτε την τέλεια λύση για τις ανάγκες της ενορίας σας</p>
            </div>
            <div class="row">
                <div class="col-lg-4 mb-4">
                    <div class="card pricing-card h-100">
                        <div class="card-header text-center bg-primary text-white">
                            <h4>Βασικό</h4>
                            <h2>€299<small>/μήνα</small></h2>
                        </div>
                        <div class="card-body">
                            <ul class="list-unstyled">
                                <li><i class="fas fa-check text-success me-2"></i>Έως 100 αρχεία</li>
                                <li><i class="fas fa-check text-success me-2"></i>Βασική αναζήτηση & φιλτράρισμα</li>
                                <li><i class="fas fa-check text-success me-2"></i>Τυπικές αναφορές</li>
                                <li><i class="fas fa-check text-success me-2"></i>Υποστήριξη μέσω email</li>
                                <li><i class="fas fa-check text-success me-2"></i>1 γλώσσα διεπαφής</li>
                            </ul>
                        </div>
                        <div class="card-footer">
                            <a href="#contact" class="btn btn-primary w-100">Ξεκινήστε</a>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4 mb-4">
                    <div class="card pricing-card featured h-100">
                        <div class="card-header text-center bg-danger text-white">
                            <h4>Τυπικό</h4>
                            <h2>€599<small>/μήνα</small></h2>
                            <span class="badge bg-warning">Πιο Δημοφιλές</span>
                        </div>
                        <div class="card-body">
                            <ul class="list-unstyled">
                                <li><i class="fas fa-check text-success me-2"></i>Έως 1000 αρχεία</li>
                                <li><i class="fas fa-check text-success me-2"></i>Προηγμένη αναζήτηση & αναλύσεις</li>
                                <li><i class="fas fa-check text-success me-2"></i>Προσαρμοσμένες αναφορές</li>
                                <li><i class="fas fa-check text-success me-2"></i>Προτεραιότητα τηλεφωνικής υποστήριξης</li>
                                <li><i class="fas fa-check text-success me-2"></i>Πολυγλωσσική διεπαφή</li>
                                <li><i class="fas fa-check text-success me-2"></i>Ενσωμάτωση λειτουργικού ημερολογίου</li>
                            </ul>
                        </div>
                        <div class="card-footer">
                            <a href="#contact" class="btn btn-danger w-100">Ξεκινήστε</a>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4 mb-4">
                    <div class="card pricing-card h-100">
                        <div class="card-header text-center bg-warning text-dark">
                           
