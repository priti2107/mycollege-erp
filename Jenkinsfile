pipeline {
    agent any

    environment {
        NGINX_ROOT = "/opt/homebrew/var/www"
    }

    stages {

        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                }
            }
        }

        stage('Build Project') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Deploy to Nginx') {
            steps {
                sh 'rm -rf $NGINX_ROOT/*'
                sh 'cp -r frontend/dist/* $NGINX_ROOT/'
            }
        }
    }

    post {
        success {
            echo "Frontend deployed successfully 🚀"
        }
        failure {
            echo "Build failed ❌ Check console logs"
        }
    }
}
