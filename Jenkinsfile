pipeline {
    agent any

    environment {
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
                    docker.withRegistry('', 'dockerhub-credentials') {
                        def authImage = docker.build("${DOCKER_REGISTRY}/auth-service:${env.BUILD_ID}", "-f auth-service/src/Dockerfile auth-service")
                        authImage.push()

                        def postImage = docker.build("${DOCKER_REGISTRY}/post-service:${env.BUILD_ID}", "-f post-service/src/Dockerfile post-service")
                        postImage.push()

                        def searchImage = docker.build("${DOCKER_REGISTRY}/search-service:${env.BUILD_ID}", "-f search-service/src/Dockerfile search-service")
                        searchImage.push()
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            agent {
                kubernetes {
                    yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: kubectl
    image: bitnami/kubectl:latest
    command: ["sleep"]
    args: ["99d"]
'''
                }
            }
            steps {
                container('kubectl') {
                    script {
                        // Replace image tags in memory
                        def authApiYaml = readFile('k8s/auth-api-deployment.yaml').replaceFirst('image:.*', "image: ${DOCKER_REGISTRY}/auth-service:${env.BUILD_ID}")
                        def authWorkerYaml = readFile('k8s/auth-worker-deployment.yaml').replaceFirst('image:.*', "image: ${DOCKER_REGISTRY}/auth-service:${env.BUILD_ID}")
                        def postApiYaml = readFile('k8s/post-api-deployment.yaml').replaceFirst('image:.*', "image: ${DOCKER_REGISTRY}/post-service:${env.BUILD_ID}")
                        def postWorkerYaml = readFile('k8s/post-worker-deployment.yaml').replaceFirst('image:.*', "image: ${DOCKER_REGISTRY}/post-service:${env.BUILD_ID}")
                        def searchApiYaml = readFile('k8s/search-api-deployment.yaml').replaceFirst('image:.*', "image: ${DOCKER_REGISTRY}/search-service:${env.BUILD_ID}")
                        def searchWorkerYaml = readFile('k8s/search-worker-deployment.yaml').replaceFirst('image:.*', "image: ${DOCKER_REGISTRY}/search-service:${env.BUILD_ID}")

                        // Apply all manifests
                        sh 'kubectl apply -f k8s/namespace.yaml'
                        sh 'kubectl apply -f k8s/configmap.yaml'

                        // Apply updated deployments
                        sh "echo '''${authApiYaml}''' | kubectl apply -f -"
                        sh "echo '''${authWorkerYaml}''' | kubectl apply -f -"
                        sh "echo '''${postApiYaml}''' | kubectl apply -f -"
                        sh "echo '''${postWorkerYaml}''' | kubectl apply -f -"
                        sh "echo '''${searchApiYaml}''' | kubectl apply -f -"
                        sh "echo '''${searchWorkerYaml}''' | kubectl apply -f -"

                        // Apply services and ingress
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