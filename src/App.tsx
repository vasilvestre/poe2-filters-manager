import "./App.css";
import {fetch} from '@tauri-apps/plugin-http'
import {invoke} from "@tauri-apps/api/core";
import {path} from "@tauri-apps/api";
import {download} from "@tauri-apps/plugin-upload";
import {Octokit} from 'octokit'
import {Endpoints} from '@octokit/types'
import { exists, mkdir, readDir, remove, rename} from "@tauri-apps/plugin-fs";
import {resolve} from "@tauri-apps/api/path";
import {useState} from "react";

export type GithubRelease = Endpoints['GET /repos/{owner}/{repo}/releases/latest']['response']

function App() {
    const [downloading, setDownloading] = useState(false);

    async function downloadZipAssetFromLatestRelease(repoOwner: string, repoName: string) {
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`);
        if (!response.ok) {
            throw new Error(`Error fetching release information: ${response.status} ${response.statusText}`);
        }

        const octokit = new Octokit({
            appId: import.meta.env.GITHUB_APP_ID,
            privateKey: import.meta.env.GITHUB_PRIVATE_KEY,
            clientId: import.meta.env.GITHUB_CLIENT_ID,
            clientSecret: import.meta.env.GITHUB_CLIENT_SECRET,
        })

        const release: GithubRelease = await octokit.request('GET /repos/{owner}/{repo}/releases/latest', {
            owner: repoOwner,
            repo: repoName,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28',
            },
        })

        const releaseData = release.data

        const zipballUrl = releaseData.zipball_url

        if (!zipballUrl) {
            throw new Error('Error fetching zipball url')
        }

        const zipTarget = await path.resolve(
            await path.downloadDir(),
            `${repoOwner}-${repoName}-${releaseData.tag_name}.zip`
        )

        const downloadDir = await resolve(await path.downloadDir(), `${repoOwner}-${repoName}`)

        if (!await exists(downloadDir)) {
            setDownloading(true)
            await download(
                zipballUrl,
                zipTarget,
                (progress) => console.log(`Downloading ${progress.progress}`), // a callback that will be called with the download progress
                new Map([['user-agent', 'cors-bypass']])
            )
            setDownloading(false)
            await mkdir(downloadDir)

            await invoke('extract', {srcZip: zipTarget, outDir: downloadDir})
        }

        if (await exists(zipTarget)) {
            await remove(zipTarget)
        }

        const entries = await readDir(downloadDir);

        for (const file of entries) {
            file.name.endsWith('.filter')
                ? await rename(await resolve(downloadDir, file.name), await resolve(await path.documentDir(), `My Games\\Path of Exile 2\\${file.name}`))
                : await remove(await resolve(downloadDir, file.name));
        }

        await remove(downloadDir)
    }

    async function downloadLatestFilter() {
        downloadZipAssetFromLatestRelease('NeverSinkDev', 'NeverSink-PoE2litefilter');
    }

    return (
        <main>
            <div className="navbar bg-base-100">
                <a className="btn btn-ghost text-xl">
                    POE2 Filters Manager
                </a>
                {downloading &&
                    <span className="loading loading-bars loading-md"></span>
                }
            </div>
            <section>
                <div className="overflow-x-auto">
                    <table className="table">
                        {/* head */}
                        <thead>
                        <tr>
                            <th>Name</th>
                            <th>Repository</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr className="hover">
                            <td>NeverSink</td>
                            <td>https://github.com/NeverSinkDev/NeverSink-PoE2litefilter</td>
                            <td>
                                <button className="btn btn-ghost text-md" onClick={(e) => {
                                    e.preventDefault();
                                    downloadLatestFilter();
                                }}>
                                    Télécharger le filtre
                                </button>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}

export default App;
