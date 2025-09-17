pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = 'docker.io/shivam1886' // e.g., 'docker.io/yourusername'
        DOCKER_CREDENTIALS = credentials('some-random-dockerhub-credentials') // Jenkins credential ID for Docker Hub
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build & Push Docker Images') {
            steps {
                script {
                    // List of services to build
                    def services = ['auth-service', 'post-service', 'search-service']

                    services.each { service ->
                        def imageName = "${DOCKER_REGISTRY}/${service}:${env.BUILD_ID}"
                        docker.withRegistry("https://${DOCKER_REGISTRY}", DOCKER_CREDENTIALS) {
                            def customImage = docker.build(imageName, "-f ${service}/src/Dockerfile ${service}")
                            customImage.push()
                        }
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {

                    // List of deployment files mapped to services
                    def deployments = [
                        'auth-service': ['auth-api-deployment.yaml', 'auth-worker-deployment.yaml'],
                        'post-service': ['post-api-deployment.yaml', 'post-worker-deployment.yaml'],
                        'search-service': ['search-api-deployment.yaml', 'search-worker-deployment.yaml']
                    ]

                    // Update image tags dynamically
                    deployments.each { service, files ->
                        files.each { file ->
                            sh "sed -i 's|image: .*|image: ${DOCKER_REGISTRY}/${service}:${env.BUILD_ID}|g' k8s/${file}"
                        }
                    }

                    withKubeConfig([credentialsId: 'kubeconfig']) {

                        // Create Kubernetes secrets securely
                        withCredentials([
                            string(credentialsId: 'db-url', variable: 'DATABASE_URL_VAL'),
                            string(credentialsId: 'access-token-secret', variable: 'ACCESS_TOKEN_SECRET_VAL'),
                            string(credentialsId: 'refresh-token-secret', variable: 'REFRESH_TOKEN_SECRET_VAL'),
                            string(credentialsId: 'cloudinary-api-secret', variable: 'CLOUDINARY_API_SECRET_VAL'),
                            string(credentialsId: 'google-api-key', variable: 'GOOGLE_API_KEY_VAL'),
                            string(credentialsId: 'pinecone-api-key', variable: 'PINECONE_API_KEY_VAL'),
                            string(credentialsId: 'email-pass', variable: 'EMAIL_PASS_VAL')
                        ]) {
                            sh """
                            kubectl create secret generic worksy-secrets --namespace=worksy \\
                                --from-literal=DATABASE_URL=${DATABASE_URL_VAL} \\
                                --from-literal=ACCESS_TOKEN_SECRET=${ACCESS_TOKEN_SECRET_VAL} \\
                                --from-literal=REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET_VAL} \\
                                --from-literal=CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET_VAL} \\
                                --from-literal=GOOGLE_API_KEY=${GOOGLE_API_KEY_VAL} \\
                                --from-literal=PINECONE_API_KEY=${PINECONE_API_KEY_VAL} \\
                                --from-literal=EMAIL_PASS=${EMAIL_PASS_VAL} \\
                                --dry-run=client -o yaml | kubectl apply -f -
                            """
                        }

                        // Apply core Kubernetes manifests
                        def k8sManifests = [
                            'namespace.yaml',
                            'configmap.yaml',
                            'auth-api-deployment.yaml', 'auth-worker-deployment.yaml', 'auth-api-service.yaml',
                            'post-api-deployment.yaml', 'post-worker-deployment.yaml', 'post-api-service.yaml',
                            'search-api-deployment.yaml', 'search-worker-deployment.yaml', 'search-api-service.yaml',
                            'ingress.yaml'
                        ]

                        k8sManifests.each { manifest ->
                            sh "kubectl apply -f k8s/${manifest}"
                        }
                    }
                }
            }
        }
    }
}
