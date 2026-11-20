pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 45, unit: 'MINUTES')
        skipDefaultCheckout(true)
    }

    environment {
        PLAYWRIGHT_WORKERS = '2'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Check agent tools') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'node --version'
                        sh 'npm --version'
                        sh 'docker compose version'
                        sh 'docker info'
                    } else {
                        bat 'node --version'
                        bat 'npm --version'
                        bat 'docker compose version'
                        bat 'docker info'
                    }
                }
            }
        }

        stage('Install dependencies and browser') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm ci'
                        sh 'npm run setup:browsers'
                    } else {
                        bat 'npm ci'
                        bat 'npm run setup:browsers'
                    }
                }
            }
        }

        stage('Run UI and API tests') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm run test:parallel'
                    } else {
                        bat 'npm run test:parallel'
                    }
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'allure-report/**,playwright-report/**,allure-results/**,artifacts/**,test-results/**', allowEmptyArchive: true
        }
    }
}
