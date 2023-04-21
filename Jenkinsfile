#!groovy
pipeline {
    agent any
    parameters {
        
        choice(name: 'FORTIFY_SCAN', choices: 'yes\nno\n', description: 'Select yes to run fortify scan')
        choice(name: 'XRAY_SCAN', choices: 'no\nyes\n', description: 'Type no to not run the xray scan')
        
    }

	environment {
		VERSION = '1'
		IMAGE= 'wi_schematic_data_service'
		REGISTRY = 'dwpecpfl-docker-snapshots.repo.openearth.io'
		FORMATTED_BRANCH_NAME="${env.BRANCH_NAME}".toLowerCase().replaceAll(/[-_]+/,"-")
		RELEASE_VERSION="${VERSION}.${env.BUILD_NUMBER}"
		IMAGE_VERSION="${FORMATTED_BRANCH_NAME}.${RELEASE_VERSION}"
        BUILD_TAG = "${FORMATTED_BRANCH_NAME}"
        BUILD_VERSION = "${BUILD_TAG}+${env.BUILD_NUMBER}"
        BUILD_IMAGE = "${IMAGE}:${VERSION}-${IMAGE_VERSION}"
		BE_PORT='80'
        WEBAPP_PORT='80'
        ARTIFACTORY = 'https://repo.openearth.community/artifactory/'
        DEPLOY_IMAGE = "${REGISTRY}/${IMAGE}:${RELEASE_VERSION}-${FORMATTED_BRANCH_NAME}.${env.BUILD_NUMBER}"
		ARTIFACTORY_IMAGE ="dwpecpfl-docker-staging.repo.openearth.io/${BUILD_IMAGE}"
		IENERGY_REGISTRY = 'distplat-docker-milestone.hub.ienergycloud.io'
        IENERGY_DEPLOY_IMAGE = "${IENERGY_REGISTRY}/dwpecpfl/${IMAGE}/${RELEASE_VERSION}/${FORMATTED_BRANCH_NAME}:${IMAGE_VERSION}"

        FORTIFY_BUILD_ID = "DWPECPFL_EDM_INT_T_SAST"
        FORTIFY_DIR = "."
        FORTIFY_TOKEN="a0d8c2dc-e96e-4ca9-800f-e8367e1d6bdf"
        FORTIFY_SSC = "https://fortify.ssc.openearth.io/ssc"
        FORTIFY_VERSION = "13868"
        FORTIFY_SCAN = "${params.FORTIFY_SCAN}"

	}
	stages {
        stage('Unit Tests'){
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'FAILURE') {
                    sh "exit 1"
                }
                echo "Running unit tests"
                sh "docker build -t ${BUILD_IMAGE}-tests -f ./Dockerfile.test ."
                sh "docker run --rm ${BUILD_IMAGE}-tests"
            }            
        }
		stage('Docker Build BE') {
			steps {
				withDockerRegistry ( [ credentialsId: "repo.openearth.io-dwpecpfl-ci", url: "https://${REGISTRY}/" ] ) {
                    echo "Build docker images"
                    // Build docker image for application
                    sh "docker build -t ${BUILD_IMAGE} ."
                }
            }
		}
        stage('Deliver Docker Images') {
            //when {
            //    expression { env.BRANCH_NAME.matches("master|Dev_Integration_Branch|DWP_Core_Package|.+-deliver\$")
            //    }
            //}
            steps {
            withDockerRegistry ( [ credentialsId: "repo.openearth.io-dwpecpfl-ci", url: "https://${REGISTRY}/" ] ) {


                sh "docker tag ${BUILD_IMAGE} ${DEPLOY_IMAGE}"
                sh "docker push ${DEPLOY_IMAGE}"
                //sh "docker rmi ${DEPLOY_IMAGE}"
                }
            }
        }
		stage('Xray scan') {
            when {
                expression { params.XRAY_SCAN == 'yes' }
            }
            steps {
                script {
                    def rtserver
                    def buildInfo = Artifactory.newBuildInfo()
                    buildInfo.project = 'dwpecpfl'
                    buildInfo.name = "${IMAGE}"
                    buildInfo.number = "${BUILD_VERSION}"
                    if (env.FORMATTED_BRANCH_NAME != ('master')){
                        buildInfo.retention maxDays: 1, deleteBuildArtifacts: true
                    }
                    echo "Docker push"
                    sh  "docker tag ${BUILD_IMAGE} ${ARTIFACTORY_IMAGE}"
                    rtDockerPush (
                        serverId: 'artifactory',
                        image: "${ARTIFACTORY_IMAGE}",
                        targetRepo: 'dwpecpfl-docker-staging',
                        buildName: "${IMAGE}",
                        buildNumber: "${BUILD_VERSION}",
                        project: 'dwpecpfl'
                    )
                    echo "Publish build info"
                    rtPublishBuildInfo (
                        serverId: 'artifactory',
                        buildName: "${IMAGE}",
                        buildNumber: "${BUILD_VERSION}",
                        project: 'dwpecpfl'
                    )

                    echo "xrayscan"
                    xrayScan (
                        serverId: 'artifactory',
                        buildName: "${IMAGE}",
                        buildNumber: "${BUILD_VERSION}",
                        project: 'dwpecpfl',
                        failBuild: true
                    )
                }

            }
        }

        stage('Fortify scan') {
            agent {
                label 'linux && fortify'
            }
            when {
                    expression { params.FORTIFY_SCAN == 'yes' }
                }
            steps {
                sh "/opt/Fortify/Fortify_SCA_and_Apps_20.1.0/bin/sourceanalyzer -b ${FORTIFY_BUILD_ID} ${FORTIFY_DIR} -clean"
                sh "/opt/Fortify/Fortify_SCA_and_Apps_20.1.0/bin/sourceanalyzer  -b ${FORTIFY_BUILD_ID} ${FORTIFY_DIR}"
                sh "/opt/Fortify/Fortify_SCA_and_Apps_20.1.0/bin/sourceanalyzer -b ${FORTIFY_BUILD_ID} -export-build-session fortify.mbs"
                sh "/opt/Fortify/Fortify_SCA_and_Apps_20.1.0/bin/scancentral -sscurl ${FORTIFY_SSC} -ssctoken ${FORTIFY_TOKEN} start -upload -versionid ${FORTIFY_VERSION} -uptoken ${FORTIFY_TOKEN} -b ${FORTIFY_BUILD_ID} -scan -autoheap -mt"
            }
        }
	}
	post {
        always {
            sh "docker images -q ${BUILD_IMAGE} | xargs -r docker rmi -f"
            deleteDir()
            dir("${env.WORKSPACE}@tmp") {
                deleteDir()
            }
            dir("${env.WORKSPACE}@script") {
                deleteDir()
            }
            dir("${env.WORKSPACE}@script@tmp") {
                deleteDir()
            }
        }
    }
}