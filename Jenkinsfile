pipeline {
    // This agent will be used for the initial stages (checkout, build)
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
                    // Use an empty string '' for the URL to default to Docker Hub.
                    docker.withRegistry('', 'dockerhub-credentials') {
                        
                        // *** TYPO FIXED HERE ***
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

        // This stage will run inside a new pod in your Kubernetes cluster
        stage('Deploy to Kubernetes') {
            agent {
                kubernetes {
                    // This defines the pod that will run the deployment steps
                    yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: kubectl
    image: bitnami/kubectl:latest
    command:
    - sleep
    args:
    - 99d
'''
                }
            }
            steps {
                // All commands inside this block run within the 'kubectl' container in the pod
                container('kubectl') {
                    script {
                        // The 'sed' commands can't be used because the workspace is fresh.
                        // We read the files, replace the image tag, and then apply them.
                        def authApiYaml = readFile('k8s/auth-api-deployment.yaml').replaceFirst('image:.*', "image: ${DOCKER_REGISTRY}/auth-service:${env.BUILD_ID}")
                        def authWorkerYaml = readFile('k8s/auth-worker-deployment.yaml').replaceFirst('image:.*', "image: ${DOCKER_REGISTRY}/auth-service:${env.BUILD_ID}")
                        def postApiYaml = readFile('k8s/post-api-deployment.yaml').replaceFirst('image:.*', "image: ${DOCKER_REGISTRY}/post-service:${env.BUILD_ID}")
                        def postWorkerYaml = readFile('k8s/post-worker-deployment.yaml').replaceFirst('image:.*', "image: ${DOCKER_REGISTRY}/post-service:${env.BUILD_ID}")
                        def searchApiYaml = readFile('k8s/search-api-deployment.yaml').replaceFirst('image:.*', "image: ${DOCKER_REGISTRY}/search-service:${env.BUILD_ID}")
                        def searchWorkerYaml = readFile('k8s/search-worker-deployment.yaml').replaceFirst('image:.*', "image: ${DOCKER_REGISTRY}/search-service:${env.BUILD_ID}")

                        // Apply the static manifests first
                        sh 'kubectl apply -f k8s/namespace.yaml'
                        sh 'kubectl apply -f k8s/configmap.yaml'
                        
                        // Securely create the Kubernetes secret
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
                                --from-literal=DATABASE_URL='${DATABASE_URL_VAL}' \\
                                --from-literal=ACCESS_TOKEN_SECRET='${ACCESS_TOKEN_SECRET_VAL}' \\
                                --from-literal=REFRESH_TOKEN_SECRET='${REFRESH_TOKEN_SECRET_VAL}' \\
                                --from-literal=CLOUDINARY_API_SECRET='${CLOUDINARY_API_SECRET_VAL}' \\
                                --from-literal=GOOGLE_API_KEY='${GOOGLE_API_KEY_VAL}' \\
                                --from-literal=PINECONE_API_KEY='${PINECONE_API_KEY_VAL}' \\
                                --from-literal=EMAIL_PASS='${EMAIL_PASS_VAL}' \\
                                --dry-run=client -o yaml | kubectl apply -f -
                            """
                        }
                        
                        // Apply the updated deployment manifests
                        sh "echo '''${authApiYaml}''' | kubectl apply -f -"
                        sh "echo '''${authWorkerYaml}''' | kubectl apply -f -"
                        sh "echo '''${postApiYaml}''' | kubectl apply -f -"
                        sh "echo '''${postWorkerYaml}''' | kubectl apply -f -"
                        sh "echo '''${searchApiYaml}''' | kubectl apply -f -"
                        sh "echo '''${searchWorkerYaml}''' | kubectl apply -f -"

                        // Apply the services and ingress
                        sh 'kubectl apply -f k8s/auth-api-service.yaml'
                        sh 'kubectl apply -f k8s/post-api-service.yaml'
                        sh 'kubectl apply -f k8s/search-api-service.yaml'
                        sh 'kubectl apply -f k8s/ingress.yaml'
                    }
                }
            }
        }
    }
}