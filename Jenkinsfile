pipeline {
    agent any

    environment {
        // Your Docker Hub username for tagging images correctly.
        DOCKER_REGISTRY = 'shivam1886'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build & Push Images') {
            steps {
                script {
                    // *** THE FIX IS HERE ***
                    // Use an empty string '' for the URL to default to Docker Hub.
                    // The credential ID 'dockerhub-credentials' is used for authentication.
                    docker.withRegistry('', 'dockerhub-credentials') {
                        
                        // Build and push Auth Service
                        def authImage = docker.build("${DOCKER_REGISTRY}/auth-service:${env.BUILD_ID}", "-f auth-service/src/Dockerfile auth-service")
                        authImage.push()

                        // Build and push Post Service
                        def postImage = docker.build("${DOCKER_REGISTRY}/post-service:${env.BUILD_ID}", "-f post-service/src/Dockerfile post-service")
                        postImage.push()
                        
                        // Build and push Search Service
                        def searchImage = docker.build("${DOCKER_REGISTRY}/search-service:${env.BUILD_ID}", "-f search-service/src/Dockerfile search-service")
                        searchImage.push()
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    // Update the image tags in the deployment files
                    sh "sed -i 's|image: .*|image: ${DOCKER_REGISTRY}/auth-service:${env.BUILD_ID}|g' k8s/auth-api-deployment.yaml"
                    sh "sed -i 's|image: .*|image: ${DOCKER_REGISTRY}/auth-service:${env.BUILD_ID}|g' k8s/auth-worker-deployment.yaml"
                    sh "sed -i 's|image: .*|image: ${DOCKER_REGISTRY}/post-service:${env.BUILD_ID}|g' k8s/post-api-deployment.yaml"
                    sh "sed -i 's|image: .*|image: ${DOCKER_REGISTRY}/post-service:${env.BUILD_ID}|g' k8s/post-worker-deployment.yaml"
                    sh "sed -i 's|image: .*|image: ${DOCKER_REGISTRY}/search-service:${env.BUILD_ID}|g' k8s/search-api-deployment.yaml"
                    sh "sed -i 's|image: .*|image: ${DOCKER_REGISTRY}/search-service:${env.BUILD_ID}|g' k8s/search-worker-deployment.yaml"

                    withKubeConfig([credentialsId: 'kubeconfig']) {
                        
                        // Securely Create Kubernetes Secret
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
                        
                        // Apply Kubernetes manifests
                        sh 'kubectl apply -f k8s/namespace.yaml'
                        sh 'kubectl apply -f k8s/configmap.yaml'
                        sh 'kubectl apply -f k8s/' // Apply all YAML files in the k8s directory
                    }
                }
            }
        }
    }
}